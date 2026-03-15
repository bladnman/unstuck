import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

import stripAnsi from 'strip-ansi';

import { UNSTUCK_COMMAND_PREFIX } from '../config/appConfig.mjs';

const DUPLICATE_TOOL_WARNING_PATTERN = /skipping duplicated tool/i;
const SHELL_SNAPSHOT_WARNING_PATTERN = /codex_core::shell_snapshot/i;

function createPublicSession(session) {
  return {
    id: session.id,
    providerId: session.provider.id,
    providerLabel: session.provider.label,
    startedAt: session.startedAt,
    status: session.status,
    transcript: session.transcript,
    notices: session.notices,
  };
}

function composePrompt(message, contextItems) {
  const sections = [];

  if (contextItems.length) {
    sections.push(
      'Context from the dashboard:',
      ...contextItems.map((item) => `- ${item}`),
      '',
    );
  }

  sections.push(message.trim());

  return `${UNSTUCK_COMMAND_PREFIX} ${sections.join('\n').trim()}`;
}

function appendToTranscript(entry, chunk) {
  entry.content += stripAnsi(chunk).replace(/\r/g, '');
  entry.updatedAt = new Date().toISOString();
}

function setTranscriptContent(entry, content) {
  entry.content = stripAnsi(content).replace(/\r/g, '');
  entry.updatedAt = new Date().toISOString();
}

function createTranscriptEntry({
  command,
  content = '',
  createdAt = new Date().toISOString(),
  exitCode = null,
  id = randomUUID(),
  kind = 'message',
  label,
  role,
  status = 'completed',
}) {
  return {
    id,
    role,
    kind,
    label,
    content,
    command,
    createdAt,
    updatedAt: createdAt,
    status,
    exitCode,
  };
}

function createVisibleErrorEntry(providerLabel, message) {
  return createTranscriptEntry({
    role: 'system',
    kind: 'error',
    label: `${providerLabel} error`,
    content: message,
    status: 'failed',
  });
}

function buildNoticeSummary(line) {
  if (DUPLICATE_TOOL_WARNING_PATTERN.test(line)) {
    return {
      id: 'duplicate-mcp-tools',
      label: 'Duplicate MCP tool warnings hidden',
      detail: 'Repeated Codex MCP duplicate-tool warnings were suppressed from the main transcript.',
    };
  }

  if (SHELL_SNAPSHOT_WARNING_PATTERN.test(line)) {
    return {
      id: 'shell-snapshot-cleanup',
      label: 'Internal shell cleanup warnings hidden',
      detail: 'Internal shell snapshot cleanup warnings were suppressed from the main transcript.',
    };
  }

  return {
    id: 'internal-cli-stderr',
    label: 'Internal CLI log lines hidden',
    detail: 'Internal stderr lines were suppressed from the main transcript to keep the conversation readable.',
  };
}

function recordNotice(session, line) {
  const trimmed = stripAnsi(line).replace(/\r/g, '').trim();
  if (!trimmed) {
    return;
  }

  const summary = buildNoticeSummary(trimmed);
  const existing = session.noticeIndex.get(summary.id);
  const timestamp = new Date().toISOString();

  if (existing) {
    existing.count += 1;
    existing.latestAt = timestamp;
    existing.lastMessage = trimmed;
    return;
  }

  const notice = {
    id: summary.id,
    label: summary.label,
    detail: summary.detail,
    count: 1,
    latestAt: timestamp,
    lastMessage: trimmed,
  };
  session.noticeIndex.set(summary.id, notice);
  session.notices.push(notice);
}

function broadcastSnapshot(manager, session, type) {
  manager.broadcast(session, { type, snapshot: createPublicSession(session) });
}

function pushTranscriptEntry(session, entry) {
  session.transcript.push(entry);
  return entry;
}

function ensurePlainAssistantEntry(session) {
  if (session.currentAssistantEntry) {
    return session.currentAssistantEntry;
  }

  const entry = createTranscriptEntry({
    role: 'assistant',
    kind: 'message',
    label: session.provider.label,
    status: 'running',
  });
  session.currentAssistantEntry = entry;
  pushTranscriptEntry(session, entry);
  return entry;
}

function flushSuppressedStderr(session, flushAll = false) {
  if (!session.stderrBuffer) {
    return;
  }

  const lines = session.stderrBuffer.split('\n');
  const trailingLine = lines.pop() ?? '';
  session.stderrBuffer = flushAll ? '' : trailingLine;
  const completedLines = flushAll ? [...lines, trailingLine] : lines;

  for (const line of completedLines) {
    recordNotice(session, line);
  }
}

function findOrCreateCommandEntry(session, item) {
  const existing = session.commandEntries.get(item.id);
  if (existing) {
    return existing;
  }

  const entry = createTranscriptEntry({
    role: 'system',
    kind: 'command',
    label: 'Command',
    command: item.command,
    content: item.aggregated_output || '',
    status: item.status || 'running',
    exitCode: item.exit_code ?? null,
  });
  session.commandEntries.set(item.id, entry);
  pushTranscriptEntry(session, entry);
  return entry;
}

function handleCodexItem(session, item, manager) {
  if (item.type === 'agent_message') {
    const text = String(item.text || '').trim();
    if (!text) {
      return;
    }

    pushTranscriptEntry(
      session,
      createTranscriptEntry({
        role: 'assistant',
        kind: 'message',
        label: session.provider.label,
        content: text,
      }),
    );
    broadcastSnapshot(manager, session, 'chunk');
    return;
  }

  if (item.type === 'command_execution') {
    const entry = findOrCreateCommandEntry(session, item);
    entry.command = item.command;
    entry.status = item.status || (item.exit_code === null ? 'running' : 'completed');
    entry.exitCode = item.exit_code ?? null;
    setTranscriptContent(entry, item.aggregated_output || '');
    broadcastSnapshot(manager, session, item.status === 'completed' ? 'chunk' : 'message');
  }
}

function processCodexStdout(session, chunk, manager) {
  session.stdoutBuffer += stripAnsi(chunk).replace(/\r/g, '');
  const lines = session.stdoutBuffer.split('\n');
  session.stdoutBuffer = lines.pop() ?? '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    try {
      const event = JSON.parse(line);
      if (event?.item) {
        handleCodexItem(session, event.item, manager);
      }
    } catch {
      appendToTranscript(ensurePlainAssistantEntry(session), `${rawLine}\n`);
      broadcastSnapshot(manager, session, 'chunk');
    }
  }
}

function flushCodexStdout(session, manager) {
  if (!session.stdoutBuffer.trim()) {
    session.stdoutBuffer = '';
    return;
  }

  processCodexStdout(session, '\n', manager);
}

function buildProviderInvocation(provider, prompt) {
  if (provider.id === 'codex') {
    return {
      command: provider.command,
      args: [
        'exec',
        '--skip-git-repo-check',
        '-C',
        provider.cwd,
        '--color',
        'never',
        '--json',
        prompt,
      ],
      mode: 'codex-json',
    };
  }

  if (provider.id === 'claude') {
    return {
      command: provider.command,
      args: ['-p', prompt],
      mode: 'plain-text',
    };
  }

  if (provider.id === 'gemini') {
    return {
      command: provider.command,
      args: ['-p', prompt, '--output-format', 'text'],
      mode: 'plain-text',
    };
  }

  return {
    command: provider.command,
    args: [prompt],
    mode: 'plain-text',
  };
}

export class CliSessionManager {
  constructor(providers) {
    this.providers = providers;
    this.sessions = new Map();
  }

  getProviders() {
    return this.providers;
  }

  createSession(providerId) {
    const provider = this.providers.find((entry) => entry.id === providerId);
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    const id = randomUUID();
    const session = {
      id,
      provider,
      transcript: [],
      notices: [],
      noticeIndex: new Map(),
      listeners: new Set(),
      startedAt: new Date().toISOString(),
      status: 'ready',
      currentAssistantEntry: null,
      currentProcess: null,
      commandEntries: new Map(),
      stdoutBuffer: '',
      stderrBuffer: '',
      turnOutputStartIndex: 0,
    };

    this.sessions.set(id, session);
    return createPublicSession(session);
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? createPublicSession(session) : null;
  }

  sendMessage(sessionId, payload) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown AI session: ${sessionId}`);
    }
    if (session.status === 'streaming') {
      throw new Error('This AI session is still processing the previous message');
    }

    const userEntry = {
      ...createTranscriptEntry({
        role: 'user',
        kind: 'message',
        label: 'You',
        content: payload.message.trim(),
      }),
      contextItems: payload.contextItems || [],
    };

    session.currentAssistantEntry = null;
    session.commandEntries.clear();
    session.stdoutBuffer = '';
    session.stderrBuffer = '';
    session.transcript.push(userEntry);
    session.turnOutputStartIndex = session.transcript.length;
    session.status = 'streaming';
    broadcastSnapshot(this, session, 'message');

    const prompt = composePrompt(payload.message, payload.contextItems || []);
    const invocation = buildProviderInvocation(session.provider, prompt);
    const child = spawn(invocation.command, invocation.args, {
      cwd: session.provider.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    session.currentProcess = child;

    child.stdout.on('data', (chunk) => {
      if (invocation.mode === 'codex-json') {
        processCodexStdout(session, String(chunk), this);
        return;
      }

      appendToTranscript(ensurePlainAssistantEntry(session), String(chunk));
      broadcastSnapshot(this, session, 'chunk');
    });

    child.stderr.on('data', (chunk) => {
      session.stderrBuffer += String(chunk);
      flushSuppressedStderr(session);
      broadcastSnapshot(this, session, 'chunk');
    });

    child.on('error', (error) => {
      pushTranscriptEntry(
        session,
        createVisibleErrorEntry(session.provider.label, error.message),
      );
      session.status = 'error';
      session.currentAssistantEntry = null;
      session.currentProcess = null;
      broadcastSnapshot(this, session, 'error');
    });

    child.on('close', (exitCode, signal) => {
      flushSuppressedStderr(session, true);
      if (invocation.mode === 'codex-json') {
        flushCodexStdout(session, this);
      }

      if (session.currentAssistantEntry) {
        session.currentAssistantEntry.status = exitCode === 0 ? 'completed' : 'failed';
      }

      if (session.transcript.length === session.turnOutputStartIndex) {
        pushTranscriptEntry(
          session,
          createTranscriptEntry({
            role: exitCode === 0 ? 'assistant' : 'system',
            kind: exitCode === 0 ? 'message' : 'error',
            label: exitCode === 0 ? session.provider.label : `${session.provider.label} error`,
            content: exitCode === 0
              ? 'No output returned.'
              : `The provider exited without visible output${signal ? ` (signal: ${signal})` : ''}.`,
            status: exitCode === 0 ? 'completed' : 'failed',
            exitCode: exitCode ?? null,
          }),
        );
      } else if (exitCode !== 0) {
        pushTranscriptEntry(
          session,
          createVisibleErrorEntry(
            session.provider.label,
            `The provider exited with code ${exitCode ?? 'unknown'}${signal ? ` (signal: ${signal})` : ''}.`,
          ),
        );
      }

      session.status = exitCode === 0 ? 'ready' : 'error';
      session.currentAssistantEntry = null;
      session.currentProcess = null;
      session.commandEntries.clear();
      session.stdoutBuffer = '';
      session.stderrBuffer = '';
      broadcastSnapshot(this, session, 'idle');
    });

    return createPublicSession(session);
  }

  subscribe(sessionId, listener) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown AI session: ${sessionId}`);
    }

    session.listeners.add(listener);
    listener({ type: 'snapshot', snapshot: createPublicSession(session) });

    return () => {
      session.listeners.delete(listener);
    };
  }

  broadcast(session, payload) {
    for (const listener of session.listeners) {
      listener(payload);
    }
  }
}
