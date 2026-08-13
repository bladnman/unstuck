# Dashboard Service Operations

## Why this exists

The dynamic dashboard is a real local web app, not just a static HTML file. If you want it available all the time on your Mac, the clean way to run it is as a user LaunchAgent instead of keeping a terminal tab open.

This repo now includes a service manager:

```bash
node scripts/manage_dashboard_service.mjs <command>
```

## What gets installed

`install` writes three local artifacts:

- `~/Library/LaunchAgents/com.unstuck.dashboard.plist`
- `~/Library/Logs/unstuck-dashboard/stdout.log`
- `~/Library/Logs/unstuck-dashboard/stderr.log`
- `~/Applications/Unstuck.webloc`

The LaunchAgent runs the server in production mode on `127.0.0.1:4004`, resolves `UNSTUCK_HOME` using the same chain as the skill, and restarts automatically after login or if the process exits.

## URL choice

The memorable browser URL is:

```text
http://unstuck.localhost:4004
```

This avoids a hosts-file change. `*.localhost` is reserved for loopback, so `unstuck.localhost` is readable and still local-only.

Important:

- A hosts-file alias can map a hostname to `127.0.0.1`
- A hosts-file alias cannot map a hostname to a port
- That means `unstuck.localhost` can replace `127.0.0.1`, but it cannot remove `:4004`

To make access easier without introducing a reverse proxy, the installer also creates `~/Applications/Unstuck.webloc`. You can launch that from Spotlight, pin it somewhere, or drop it into the Dock.

## Commands

Install and start the service:

```bash
node scripts/manage_dashboard_service.mjs install
```

Install with an explicit data directory:

```bash
node scripts/manage_dashboard_service.mjs install --unstuck-home /absolute/path/to/unstuck
```

Check status:

```bash
node scripts/manage_dashboard_service.mjs status
```

Rebuild the app and restart the service after dashboard code changes:

```bash
node scripts/manage_dashboard_service.mjs restart
```

Open the dashboard in the default browser:

```bash
node scripts/manage_dashboard_service.mjs open
```

Stop the loaded LaunchAgent without deleting the plist:

```bash
node scripts/manage_dashboard_service.mjs stop
```

Remove the LaunchAgent:

```bash
node scripts/manage_dashboard_service.mjs uninstall
```

## Notes

- `install` builds the dashboard before loading the LaunchAgent.
- `restart` also rebuilds by default so the always-on service stays aligned with the latest code.
- If you only want to restart the already-built app, add `--skip-build`.
- The service keeps using port `4004` unless you install it with a different `--port`.
- If the AI panel should discover CLIs like `codex`, `claude`, or `gemini`, keep those binaries on a normal shell path. The LaunchAgent writes a broad `PATH` on purpose for that reason.
