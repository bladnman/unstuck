# unstuck

A thinking partner skill for agentic coding tools. Get what's in your head out, organized, and visible.

## Installation

```bash
npx skills add bladnman/unstuck
```

## What it does

You talk. It listens, captures, and organizes.

Unstuck is a conversational skill that helps you externalize everything swimming in your head — tasks, ideas, anxieties, half-formed plans, competing priorities — and turns it into a structured, searchable, persistent system of markdown files. It's not a to-do app, not a planner, not an ideation tool. It's a **thinking partner** that catches what you say and gives it back to you organized.

Everything lives in one central folder (`~/.unstuck/` by default), accessible from any project directory. Items accumulate context over time. Sessions are logged. Memory compounds — the skill learns how you think and what you care about, so every conversation starts warm.

## Quick usage

**Brain dump:**
```
/unstuck I'm overwhelmed, let me get everything out
```
Start talking. The skill captures everything, identifies distinct items, creates organized folders, and reflects patterns back to you.

**Check in:**
```
/unstuck what should I work on today?
```
Gets a recommendation based on your active items, deadlines, and energy patterns.

**Recall:**
```
/unstuck what was that API thing we talked about?
```
Finds and surfaces your captured notes on a topic.

**Review:**
```
/unstuck what's on my list?
```
Shows the current state of everything you're tracking — active, simmering, parked.

**Dashboard:**
```
/unstuck show me my dashboard
```
Generates an interactive HTML dashboard with table, kanban, and timeline views.

## How it works

```
~/.unstuck/                          # Default location (relocatable)
├── INDEX.md                    # Living overview of all items (the query surface)
├── memory/                     # Who you are and how you like to work
│   ├── MEMORY.md
│   └── *.md
├── items/                      # One folder per topic/idea/task
│   └── api-redesign-idea/
│       ├── ITEM.md             # The definitive, evolving readout
│       └── context/            # Supporting material and session extracts
├── sessions/                   # Chronological session logs
│   └── 2026-03-12/
│       ├── SESSION.md
│       └── raw/                # Verbatim inputs preserved
└── dashboard.html              # Generated visual snapshot
```

**Items are folders, not files.** Each topic accumulates context over time — new sessions add to it, but the ITEM.md stays coherent. Context files preserve your exact words. Nothing gets overwritten or lost.

**The INDEX is the primary data structure.** It's the first thing read at session start and the answer to most queries. Items are sorted by recency within their lifecycle state (Active, Simmering, Parked, Archived, Resolved).

**Memory makes it compound.** The skill maintains its own persistent memory about who you are, how you like to interact, what corrections you've given, and the shape of your priorities. This is what makes session 50 feel different from session 1.

## Data location

By default, data lives at `~/.unstuck/`. If you want it somewhere else — like a synced folder for multi-machine access — just tell the skill:

```
/unstuck change location
```

It will move your data to the new path and leave a pointer file at `~/.unstuck/relocated.md` so every future session finds it automatically. Multiple agent tools on multiple machines can all share the same data this way.

You can also set the `UNSTUCK_HOME` environment variable to override everything.

## Designed for agentic coding tools

This skill works with any agent that can read/write files and hold a conversation:

- **Cursor** — add to `~/.cursor/skills/`
- **Claude Code** — add to `~/.claude/skills/`
- **Codex** — add to `~/.codex/skills/`
- **Anything else** — as long as it can read the SKILL.md and follow instructions, it works

No APIs, no dependencies, no build step. It's markdown files and a conversation protocol.

## License

MIT
