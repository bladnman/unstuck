import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_AI_WORKDIR } from '../config/appConfig.mjs';

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

async function isExecutable(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile() && !stats.isSymbolicLink()) {
      return false;
    }

    await fs.access(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command) {
  if (path.isAbsolute(command)) {
    return isExecutable(command);
  }

  const searchPath = process.env.PATH || '';
  const directories = searchPath.split(path.delimiter).filter(Boolean);

  for (const directory of directories) {
    if (await isExecutable(path.join(directory, command))) {
      return true;
    }
  }

  return false;
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
