# Unstuck Dynamic Dashboard

This is the interactive companion app for the Unstuck skill. It lives inside the skill repo for now, but it is intentionally isolated so it can be moved into its own delivery shape later.

## What it does

- Reads and writes the canonical `index.json`
- Keeps `ITEM.md` content accessible and editable from the dashboard
- Shares one filter model across table, board, day, and timeline views
- Refreshes the static `dashboard-data.js` companion after mutations
- Opens an experimental AI side panel backed by local CLI sessions

## Run

```bash
npm install --legacy-peer-deps
npm run dev
```

By default the server runs on `http://127.0.0.1:4004`.

To point it at a specific Unstuck data directory:

```bash
UNSTUCK_HOME=/absolute/path/to/unstuck npm run dev
```

## Always-on on macOS

If you want the dashboard available all the time without keeping a terminal tab open, install the LaunchAgent from the repo root:

```bash
node scripts/manage_dashboard_service.mjs install
```

That installs a user LaunchAgent, keeps the server on port `4004`, and creates a Spotlight-friendly bookmark at `~/Applications/Unstuck.webloc`.

The browser URL is:

```text
http://unstuck.localhost:4004
```

For status, restart, stop, and uninstall commands, see [documents/operations/OPERATIONS_dashboard_service.md](/Users/mmaher/code/unstuck/documents/operations/OPERATIONS_dashboard_service.md).

## Verify

```bash
npm run check
npm run build
```
