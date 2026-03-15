import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

import stripAnsi from 'strip-ansi';

import { UNSTUCK_COMMAND_PREFIX } from '../config/appConfig.mjs';

function createPublicSession(session) {
  return {
    id: session.id,
    providerId: session.provider.id,
    providerLabel: session.provider.label,
    startedAt: session.startedAt,
    status: session.status,
    transcript: session.transcript,
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
        prompt,
      ],
    };
  }

  if (provider.id === 'claude') {
    return {
      command: provider.command,
      args: ['-p', prompt],
    };
  }

  if (provider.id === 'gemini') {
    return {
      command: provider.command,
      args: ['-p', prompt, '--output-format', 'text'],
    };
  }

  return {
    command: provider.command,
    args: [prompt],
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
      listeners: new Set(),
      startedAt: new Date().toISOString(),
      status: 'ready',
      currentAssistantMessageId: null,
      currentProcess: null,
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
      id: randomUUID(),
      role: 'user',
      content: payload.message.trim(),
      createdAt: new Date().toISOString(),
      contextItems: payload.contextItems || [],
    };
    const assistantEntry = {
      id: randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };

    session.transcript.push(userEntry, assistantEntry);
    session.currentAssistantMessageId = assistantEntry.id;
    session.status = 'streaming';
    this.broadcast(session, { type: 'message', snapshot: createPublicSession(session) });

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
      appendToTranscript(assistantEntry, String(chunk));
      this.broadcast(session, { type: 'chunk', snapshot: createPublicSession(session) });
    });

    child.stderr.on('data', (chunk) => {
      appendToTranscript(assistantEntry, String(chunk));
      this.broadcast(session, { type: 'chunk', snapshot: createPublicSession(session) });
    });

    child.on('error', (error) => {
      appendToTranscript(assistantEntry, `\n${error.message}\n`);
      session.status = 'error';
      session.currentAssistantMessageId = null;
      session.currentProcess = null;
      this.broadcast(session, { type: 'error', snapshot: createPublicSession(session) });
    });

    child.on('close', (exitCode, signal) => {
      if (!assistantEntry.content.trim()) {
        assistantEntry.content = exitCode === 0
          ? 'No output returned.'
          : `The provider exited without output${signal ? ` (signal: ${signal})` : ''}.`;
      }

      session.status = exitCode === 0 ? 'ready' : 'error';
      session.currentAssistantMessageId = null;
      session.currentProcess = null;
      this.broadcast(session, { type: 'idle', snapshot: createPublicSession(session) });
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
