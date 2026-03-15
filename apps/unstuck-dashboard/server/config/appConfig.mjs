import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(configDirectory, '..');
const appRoot = path.resolve(serverRoot, '..');
const repoRoot = path.resolve(appRoot, '..', '..');

export const APP_ROOT = appRoot;
export const REPO_ROOT = repoRoot;
export const CLIENT_DIST = path.join(APP_ROOT, 'dist');
export const CLIENT_ENTRY = path.join(APP_ROOT, 'index.html');
export const DASHBOARD_PORT = Number(process.env.PORT || 4004);
export const DASHBOARD_HOST = process.env.HOST || '127.0.0.1';
export const UNSTUCK_COMMAND_PREFIX = process.env.UNSTUCK_COMMAND_PREFIX || '/unstuck';
export const DEFAULT_AI_WORKDIR = process.env.UNSTUCK_AI_WORKDIR || REPO_ROOT;
