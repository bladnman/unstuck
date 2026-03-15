# Dynamic Dashboard Architecture

## Why this exists

The static dashboard already works as a read-only exhaust of `index.json`, but the request on 2026-03-14 shifts the product shape: Unstuck should remain a skill, while a separate application grows alongside it to become the interactive surface for planning, editing, and AI-assisted conversation.

## Decisions captured here

- Keep the existing static dashboard intact.
- Build the interactive experience in a separate folder so it can be moved into its own repo or bundle later.
- Keep `index.json` as the canonical contract for both the skill and both dashboards.
- Treat the dynamic app as server-backed from the start.
- Default the server to port `4004`.
- Keep item-folder markdown and the canonical index in sync when edits come from the dashboard.
- Follow the copied UI standards in [documents/reference/UI_DEV_STANDARDS.md](/Users/mmaher/code/unstuck/documents/reference/UI_DEV_STANDARDS.md).

## Current implementation

The dynamic app lives in [apps/unstuck-dashboard](/Users/mmaher/code/unstuck/apps/unstuck-dashboard).

### Server

- Express server with Vite middleware in development
- Default host/port: `127.0.0.1:4004`
- Resolves `UNSTUCK_HOME` using the same chain as the skill:
  1. `UNSTUCK_HOME`
  2. `~/.unstuck/relocated.md`
  3. `~/.unstuck/`
- Reads and writes the canonical index
- Refreshes `dashboard-data.js` after mutations so the static dashboard stays current
- Watches `UNSTUCK_HOME` and pushes refresh events to the client
- Exposes item-detail endpoints that read `ITEM.md` and `context/*.md`
- Supports finer-grained day scheduling with `fixedStartTime` and `durationMinutes` alongside `plannedStart`

### Client

- React + Vite
- Fractal structure centered on `src/pages/DashboardPage`
- Shared filters across:
  - Table
  - Board
  - Day
  - Timeline
- Right rail for:
  - Item detail and markdown editing
  - AI panel

### AI panel

- Uses a PTY-backed session manager
- Detects local CLIs when possible: `codex`, `claude`, `gemini`
- Prefixes prompts with `/unstuck`
- Supports session continuity and streaming transcript updates
- Treat this as groundwork, not a finished agent UI

## Known limits

- Screenshot binaries from the original request were not exposed as local files during this run, so they are tracked by manifest rather than copied image assets.
- Timeline drag is a first pass: it supports moving the planned start date and changing duration, but not every timeline editing gesture discussed in the request.
- Kanban ordering writes rank values into the index, but richer priority semantics still need design work.
- AI transcript rendering is terminal-derived and experimental.

## Run it

```bash
cd /Users/mmaher/code/unstuck/apps/unstuck-dashboard
UNSTUCK_HOME=/absolute/path/to/unstuck npm install --legacy-peer-deps
UNSTUCK_HOME=/absolute/path/to/unstuck npm run dev
```

Then open [http://127.0.0.1:4004](http://127.0.0.1:4004).
