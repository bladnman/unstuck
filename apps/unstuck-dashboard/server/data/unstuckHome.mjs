import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function parseRelocatedPath(pointerPath) {
  const content = await fs.readFile(pointerPath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }

  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key?.trim() === 'path') {
      return rest.join(':').trim();
    }
  }

  return null;
}

export async function resolveUnstuckHome() {
  if (process.env.UNSTUCK_HOME) {
    return process.env.UNSTUCK_HOME;
  }

  const defaultHome = path.join(os.homedir(), '.unstuck');
  const pointerPath = path.join(defaultHome, 'relocated.md');

  if (await pathExists(pointerPath)) {
    const redirected = await parseRelocatedPath(pointerPath);
    if (redirected) {
      return redirected;
    }
  }

  return defaultHome;
}

export async function ensureUnstuckHome(home) {
  await fs.mkdir(home, { recursive: true });
  await Promise.all([
    fs.mkdir(path.join(home, 'items'), { recursive: true }),
    fs.mkdir(path.join(home, 'sessions'), { recursive: true }),
    fs.mkdir(path.join(home, 'memory'), { recursive: true }),
  ]);
}
