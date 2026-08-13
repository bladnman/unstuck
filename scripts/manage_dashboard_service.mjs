#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');
const appRoot = path.join(repoRoot, 'apps', 'unstuck-dashboard');
const supervisorEntry = path.join(repoRoot, 'scripts', 'run_dashboard_supervisor.sh');
const serverEntry = path.join(appRoot, 'server', 'dev-server.mjs');

const launchAgentLabel = 'com.unstuck.dashboard';
const launchAgentDirectory = path.join(os.homedir(), 'Library', 'LaunchAgents');
const launchAgentPath = path.join(launchAgentDirectory, `${launchAgentLabel}.plist`);
const logDirectory = path.join(os.homedir(), 'Library', 'Logs', 'unstuck-dashboard');
const shortcutPath = path.join(os.homedir(), 'Applications', 'Unstuck.webloc');

const defaultHost = '127.0.0.1';
const defaultPort = 4004;
const defaultUrlHost = 'unstuck.localhost';

const launchctlBin = '/bin/launchctl';
const openBin = '/usr/bin/open';
const lsofBin = '/usr/sbin/lsof';
const zshBin = '/bin/zsh';

function usage() {
  console.error('Usage: node scripts/manage_dashboard_service.mjs <install|restart|start|stop|status|open|uninstall> [--port 4004] [--host 127.0.0.1] [--url-host unstuck.localhost] [--unstuck-home /absolute/path] [--skip-build]');
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    host: defaultHost,
    port: defaultPort,
    skipBuild: false,
    unstuckHome: null,
    urlHost: defaultUrlHost,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }

    const value = rest[index + 1];
    if (!value) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === '--host') {
      options.host = value;
      index += 1;
      continue;
    }

    if (arg === '--port') {
      options.port = Number(value);
      index += 1;
      continue;
    }

    if (arg === '--unstuck-home') {
      options.unstuckHome = value;
      index += 1;
      continue;
    }

    if (arg === '--url-host') {
      options.urlHost = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.command) {
    usage();
    process.exit(1);
  }

  if (!Number.isInteger(options.port) || options.port <= 0) {
    throw new Error(`Invalid port: ${options.port}`);
  }

  return options;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveUnstuckHome(explicitHome) {
  if (explicitHome) {
    return path.resolve(explicitHome);
  }

  if (process.env.UNSTUCK_HOME) {
    return process.env.UNSTUCK_HOME;
  }

  const defaultHome = path.join(os.homedir(), '.unstuck');
  const pointerPath = path.join(defaultHome, 'relocated.md');

  if (await exists(pointerPath)) {
    const content = await fs.readFile(pointerPath, 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      for (const line of match[1].split('\n')) {
        const [key, ...rest] = line.split(':');
        if (key?.trim() === 'path') {
          const redirected = rest.join(':').trim();
          if (redirected) {
            return redirected;
          }
        }
      }
    }
  }

  return defaultHome;
}

function buildLaunchPath(nodePath) {
  const candidates = [
    path.dirname(nodePath),
    path.join(os.homedir(), '.volta', 'bin'),
    path.join(os.homedir(), '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
    ...(process.env.PATH ? process.env.PATH.split(':') : []),
  ];

  const unique = [];
  for (const candidate of candidates) {
    if (!candidate || unique.includes(candidate)) {
      continue;
    }
    unique.push(candidate);
  }

  return unique.join(':');
}

function renderPlist({
  host,
  nodePath,
  port,
  stdoutPath,
  stderrPath,
  unstuckHome,
}) {
  const environment = {
    HOME: os.homedir(),
    HOST: host,
    NODE_ENV: 'production',
    PATH: buildLaunchPath(nodePath),
    PORT: String(port),
    UNSTUCK_HOME: unstuckHome,
    UNSTUCK_NODE_BIN: nodePath,
    USER: os.userInfo().username,
  };

  const envBlock = Object.entries(environment)
    .map(([key, value]) => `    <key>${escapeXml(key)}</key>\n    <string>${escapeXml(value)}</string>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(launchAgentLabel)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(supervisorEntry)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(appRoot)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${escapeXml(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(stderrPath)}</string>
  <key>EnvironmentVariables</key>
  <dict>
${envBlock}
  </dict>
</dict>
</plist>
`;
}

function renderWebloc(url) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>${escapeXml(url)}</string>
</dict>
</plist>
`;
}

function getDashboardUrl(urlHost, port) {
  return `http://${urlHost}:${port}`;
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: options.stdio ?? 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 || options.allowFailure) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function shellWhich(binary) {
  const { stdout } = await execFileAsync(zshBin, ['-lc', `command -v ${binary}`], {
    cwd: repoRoot,
  });
  const resolved = stdout.trim();
  if (!resolved) {
    throw new Error(`Could not resolve ${binary} in the current shell.`);
  }
  return resolved;
}

function getLaunchAgentTarget() {
  return `gui/${process.getuid()}/${launchAgentLabel}`;
}

async function isLoaded() {
  try {
    await execFileAsync(launchctlBin, ['print', getLaunchAgentTarget()]);
    return true;
  } catch {
    return false;
  }
}

async function waitForLoadedState(expectedLoaded, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if ((await isLoaded()) === expectedLoaded) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });
  }

  throw new Error(`Timed out waiting for ${launchAgentLabel} loaded=${expectedLoaded}`);
}

async function bootoutIfLoaded() {
  if (!(await isLoaded())) {
    return;
  }

  await runCommand(launchctlBin, ['bootout', getLaunchAgentTarget()], {
    allowFailure: true,
  });
  await waitForLoadedState(false);
}

async function ensureRuntimeReady(skipBuild) {
  const npmPath = await shellWhich('npm');

  if (!(await exists(path.join(appRoot, 'node_modules')))) {
    await runCommand(npmPath, ['install', '--legacy-peer-deps'], {
      cwd: appRoot,
    });
  }

  if (!skipBuild) {
    await runCommand(npmPath, ['run', 'build'], {
      cwd: appRoot,
    });
  }
}

async function writeLaunchAgent({
  host,
  nodePath,
  port,
  unstuckHome,
  urlHost,
}) {
  const stdoutPath = path.join(logDirectory, 'stdout.log');
  const stderrPath = path.join(logDirectory, 'stderr.log');

  await fs.mkdir(launchAgentDirectory, { recursive: true });
  await fs.mkdir(logDirectory, { recursive: true });
  await fs.mkdir(path.dirname(shortcutPath), { recursive: true });

  await fs.writeFile(
    launchAgentPath,
    renderPlist({
      host,
      nodePath,
      port,
      stderrPath,
      stdoutPath,
      unstuckHome,
    }),
    'utf8',
  );

  await fs.writeFile(shortcutPath, renderWebloc(getDashboardUrl(urlHost, port)), 'utf8');
}

async function install(options) {
  if (process.platform !== 'darwin') {
    throw new Error('Dashboard LaunchAgent setup currently supports macOS only.');
  }

  const nodePath = await shellWhich('node');
  const unstuckHome = await resolveUnstuckHome(options.unstuckHome);

  await ensureRuntimeReady(options.skipBuild);
  await writeLaunchAgent({
    host: options.host,
    nodePath,
    port: options.port,
    unstuckHome,
    urlHost: options.urlHost,
  });

  await bootoutIfLoaded();
  await runCommand(launchctlBin, ['bootstrap', `gui/${process.getuid()}`, launchAgentPath]);
  await waitForLoadedState(true);

  console.log(`Installed ${launchAgentLabel}`);
  console.log(`LaunchAgent: ${launchAgentPath}`);
  console.log(`Shortcut: ${shortcutPath}`);
  console.log(`UNSTUCK_HOME: ${unstuckHome}`);
  console.log(`URL: ${getDashboardUrl(options.urlHost, options.port)}`);
}

async function restart(options) {
  if (!(await exists(launchAgentPath))) {
    await install(options);
    return;
  }

  const nodePath = await shellWhich('node');
  const unstuckHome = await resolveUnstuckHome(options.unstuckHome);

  await ensureRuntimeReady(options.skipBuild);
  await writeLaunchAgent({
    host: options.host,
    nodePath,
    port: options.port,
    unstuckHome,
    urlHost: options.urlHost,
  });
  await bootoutIfLoaded();
  await runCommand(launchctlBin, ['bootstrap', `gui/${process.getuid()}`, launchAgentPath], {
    allowFailure: true,
  });
  await waitForLoadedState(true);

  console.log(`Restarted ${launchAgentLabel}`);
  console.log(`UNSTUCK_HOME: ${unstuckHome}`);
  console.log(`URL: ${getDashboardUrl(options.urlHost, options.port)}`);
}

async function start() {
  if (!(await exists(launchAgentPath))) {
    throw new Error(`LaunchAgent plist not found at ${launchAgentPath}. Run install first.`);
  }

  if (!(await isLoaded())) {
    await runCommand(launchctlBin, ['bootstrap', `gui/${process.getuid()}`, launchAgentPath]);
    await waitForLoadedState(true);
  }

  await runCommand(launchctlBin, ['kickstart', '-k', getLaunchAgentTarget()]);
  console.log(`Started ${launchAgentLabel}`);
}

async function stop() {
  if (!(await isLoaded())) {
    console.log(`${launchAgentLabel} is not currently loaded.`);
    return;
  }

  await runCommand(launchctlBin, ['bootout', getLaunchAgentTarget()]);
  console.log(`Stopped ${launchAgentLabel}`);
}

async function uninstall() {
  await bootoutIfLoaded();

  if (await exists(launchAgentPath)) {
    await fs.unlink(launchAgentPath);
  }

  console.log(`Removed ${launchAgentLabel}`);
  console.log(`LaunchAgent plist deleted: ${launchAgentPath}`);
}

async function getListenerDetails(port) {
  try {
    const { stdout } = await execFileAsync(lsofBin, [
      '-nP',
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
    ]);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function getHttpHealth(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2000),
    });
    return `${response.status} ${response.statusText}`;
  } catch (error) {
    return error instanceof Error ? error.message : 'Request failed';
  }
}

async function status(options) {
  const url = getDashboardUrl(options.urlHost, options.port);
  const launchAgentPresent = await exists(launchAgentPath);
  const shortcutPresent = await exists(shortcutPath);
  const loaded = await isLoaded();
  const listener = await getListenerDetails(options.port);
  const health = await getHttpHealth(url);

  console.log(`Label: ${launchAgentLabel}`);
  console.log(`Loaded: ${loaded ? 'yes' : 'no'}`);
  console.log(`LaunchAgent plist: ${launchAgentPresent ? launchAgentPath : 'missing'}`);
  console.log(`Shortcut: ${shortcutPresent ? shortcutPath : 'missing'}`);
  console.log(`URL: ${url}`);
  console.log(`HTTP: ${health}`);
  console.log(listener ? `Listener:\n${listener}` : `Listener: none on port ${options.port}`);
}

async function openDashboard(options) {
  await runCommand(openBin, [getDashboardUrl(options.urlHost, options.port)]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === 'install') {
    await install(options);
    return;
  }

  if (options.command === 'restart') {
    await restart(options);
    return;
  }

  if (options.command === 'start') {
    await start();
    return;
  }

  if (options.command === 'stop') {
    await stop();
    return;
  }

  if (options.command === 'status') {
    await status(options);
    return;
  }

  if (options.command === 'open') {
    await openDashboard(options);
    return;
  }

  if (options.command === 'uninstall') {
    await uninstall();
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
