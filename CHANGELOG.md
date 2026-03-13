# Changelog

What's new, what's better, what's different. Most recent stuff on top.

---

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
