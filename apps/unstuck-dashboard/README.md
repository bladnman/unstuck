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

## Verify

```bash
npm run check
npm run build
```
