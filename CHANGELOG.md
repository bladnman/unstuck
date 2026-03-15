# Changelog

What's new, what's better, what's different. Most recent stuff on top.

---

## 0.3.3 — The Roomier Chat (2026-03-15)

The AI assistant is no longer wedged into the rail. It opens in a larger overlay now, which gives the conversation space to breathe without undoing the transcript cleanup work that landed just before it.

- Moved the full AI chat surface out of the rail and into a dedicated overlay panel
- Left the rail as a lighter launch/status dock instead of the primary conversation container
- Updated the dashboard header call-to-action to match the new overlay behavior
- Kept transcript/session behavior unchanged so this patch stays about layout room, not chat internals

## 0.3.2 — The Detail Popup (2026-03-15)

Picking an item is much harder to miss now. Details open in a dedicated surface, the selected item shows up immediately while richer content loads, and the old “maybe the sidebar updated somewhere” feeling is gone.

- Moved item details into a modal-style surface instead of relying on the rail/sidebar to be visible enough
- Made detail loading selection-aware so older fetches cannot overwrite a newer click
- Added immediate selected-item shell rendering plus loading feedback while markdown and context hydrate
- Kept the AI panel changes out of this patch so the separate AI-surface rethink can land on its own

## 0.3.1 — The Transcript Tamer (2026-03-15)

The AI side panel is much less chaotic now. Streaming stays pinned to the latest activity, internal CLI noise gets pushed out of the main conversation, and shell work reads like separate steps instead of one mashed-up log blob.

- Switched Codex session capture to structured JSON events so assistant messages and commands land as distinct transcript entries
- Hid repeated duplicate-tool and shell snapshot warnings behind compact notice pills instead of dumping them into the visible chat
- Added stick-to-bottom streaming behavior unless you intentionally scroll away
- Styled command blocks and capped their visible output so startup/tool chatter stops overwhelming the actual answer

## 0.3.0 — The Control Room (2026-03-15)

Unstuck has a real control surface now. The system reads from a structured canonical index, the dashboard can act on live data, and the skill got stricter about catching ideas first so the important stuff lands before it slips away.

- Added `index.json` as the canonical system index and treated dashboard artifacts as derived views
- Added the server-backed `unstuck-dashboard` app for browsing, editing, and filtering live item data
- Added queue and sync scripts for staged ingest, single-writer index updates, and dashboard refreshes
- Updated the skill, docs, and eval fixtures for capture-first behavior and now-first planning windows

## 0.2.0 — The Nomad (2026-03-12)

Your data can live anywhere now. The skill resolves its data directory through a discovery chain — env var, pointer file, or default — so you can relocate to iCloud, Dropbox, or wherever and every machine finds it. Just say "move my data" and point it at a path.

- Added UNSTUCK_HOME discovery chain (env var → `~/.unstuck/relocated.md` → `~/.unstuck/`)
- Added relocate mode for moving data to synced folders
- Updated SKILL.md to use portable paths instead of hardcoded ones
- Updated README with data location docs and relocation instructions

## 0.1.0 — Hello, World (2026-03-12)

Project scaffolding. Version tracking, changelog, and actions directory in place. No skill logic yet — just the bones.

- Added `actions/version.md` with version tracking
- Added `CHANGELOG.md`
- Added version bump and changelog rules to `AGENTS.md`
