import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { DEFAULT_AI_WORKDIR, REPO_ROOT } from '../config/appConfig.mjs';

const execFileAsync = promisify(execFile);

const BASE_PROVIDERS = [
  {
    id: 'codex',
    label: 'Codex CLI',
    command: 'codex',
    cwd: DEFAULT_AI_WORKDIR,
  },
  {
    id: 'claude',
    label: 'Claude Code',
    command: 'claude',
    cwd: DEFAULT_AI_WORKDIR,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    command: 'gemini',
    cwd: DEFAULT_AI_WORKDIR,
  },
];

async function commandExists(command) {
  try {
    await execFileAsync('zsh', ['-lc', `command -v ${command}`], {
      cwd: REPO_ROOT,
    });
    return true;
  } catch {
    return false;
  }
}

export async function discoverCliProviders() {
  const resolved = await Promise.all(
    BASE_PROVIDERS.map(async (provider) => ({
      ...provider,
      available: await commandExists(provider.command),
    })),
  );

  return resolved.filter((provider) => provider.available);
}

export function getFallbackProviders() {
  return BASE_PROVIDERS.map((provider) => ({
    ...provider,
    available: false,
  }));
}
