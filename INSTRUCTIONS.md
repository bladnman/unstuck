# Code Project

This folder is a software repository. Treat it like a normal coding project: read existing code and docs first, follow established conventions, and make changes that are minimal and reviewable.

## Defaults

- Prefer working with the project's existing tools and scripts (build, test, lint, format).
- Avoid broad rewrites unless explicitly asked; incremental changes are preferred.
- Ask before adding new dependencies or changing the project's architecture.
- Keep secrets out of the repo. Use `.env.example` for example environment variables.

## Layout (Suggested, Not Required)

Common folders you may see (or choose to create if asked) include:

- `src/` — Application/library code
- `tests/` — Tests
- `scripts/` — Automation scripts
- `docs/` — Design docs and notes
- `examples/` — Usage examples and demos

---

## Capture Intent, Not Just Deliverables

When the user asks for something, two things are happening:

1. **The deliverable** — the artifact being requested
2. **The intent** — the concerns, constraints, tensions, and reasoning that shape *how* and *why* it should be built

**Do not let intent evaporate.** Intent is metadata that must be stored alongside the work, not consumed once and discarded.

- Future iterations need access to the full thinking
- Related work shares the same concerns and constraints
- The nuance IS the value — without it, future work loses critical context

When the user shares intent while requesting work, capture it in a context or notes file alongside the artifact. If you sense you're missing intent, ask — or note the gap.

---

## Preserve Nuance

**Do not over-summarize.** When capturing information:

- Keep the user's exact phrasing where it carries meaning
- Do not round nuanced positions into clean categories
- When in doubt, quote directly rather than paraphrase
- If something is "just short of a hard requirement" — say that, don't simplify to "requirement" or "preference"

---

## File Naming Conventions

Use a **TYPE prefix** in uppercase at the start of filenames so files of the same kind sort together:

```
PROMPT_campaign_brief.md
SCRIPT_intro_sequence.md
NOTES_stakeholder_feedback.md
OUTLINE_video_structure.md
DRAFT_announcement_letter.md
```

The prefix describes what the file *is*, not its topic. Choose a clear, short type name that fits the content.

### Versioning

For **minor edits** (typos, small tweaks, additions), edit the file in place.

For **major revisions** (rewrites, new direction, structural changes), create a new version:

```
SCRIPT_intro_sequence_v01.md
SCRIPT_intro_sequence_v02.md
```

This preserves the ability to compare or revert without relying on git history alone.

---

## Long-Term Memory

Keep durable project memory in this file, not in `CLAUDE.md`, `AGENTS.md`, or `GEMINI.md`.

- Use this section for decisions, non-obvious constraints, stable preferences, and important context worth carrying forward.
- Prefer appending dated bullets so future runs can track why decisions were made.
- Keep temporary task notes in normal working docs; only keep long-lived context here.
- 2026-03-13: The canonical index is machine-readable `index.json`, not human-oriented `INDEX.md`. It exists for the entire system's query performance; the dashboard is only exhaust over that index. `dashboard-data.js` may be derived from `index.json` for direct `file://` browser use, but it must never become the source of truth. Any change to `index.json` makes `dashboard-data.js` stale until it is regenerated.
- 2026-03-13: Optimistic planning windows belong in `index.json`. `plannedStart`, `durationDays`, `planningMode`, and `planningNote` should be maintained as revisable working assumptions so the system and the dashboard can reason about the next plausible push without rereading every item.
- 2026-03-13: Ingest should be staged. Understanding the user's input and deciding item boundaries is serial; once that map is clear, item-local bookkeeping should fan out. If the host supports subagents and there are 2 or more item packets, the default is one subagent per item packet instead of inline bookkeeping. If subagents are not used, the agent should say why. `index.json` remains single-writer. When an environment supports subagents, coordinate index updates through a file-backed queue such as `UNSTUCK_HOME/.work-queue/index/`. This repo now includes helper scripts for that pattern: `scripts/create_ingest_run.mjs`, `scripts/update_ingest_packet.mjs`, `scripts/queue_index_update.mjs`, `scripts/finalize_ingest_run.mjs`, and `scripts/drain_index_queue.mjs`.
- 2026-03-14: Memory capture needs an explicit post-session extraction pass. Durable personal facts like family names, recurring calls, daily exercise, meal/watch patterns, and vocabulary disambiguations are first-class memory, not optional flavor text. The skill should not rely on "good judgment" alone to promote them out of raw inputs.
- 2026-03-14: The skill is now-first, not project-first. Highly transient, dated things are still first-class items if they matter in the immediate window. The system should not over-bundle them into vague plans, and it should archive or let them sink quickly once their window passes.
- 2026-03-14: The repo now has two dashboard tracks. Keep the static `dashboard.html`/`dashboard-data.js` flow as exhaust over the canonical index, and grow the interactive app separately under `apps/unstuck-dashboard/` so it can move into its own delivery shape later without changing the core file contract.
- 2026-03-14: UI work for the dynamic dashboard should follow the copied standards in `documents/reference/UI_DEV_STANDARDS.md`: page/feature/sub-feature structure, humble components, co-located hooks/utils, and theme-driven styling instead of ad hoc inline presentation.
- 2026-03-14: The interactive dashboard is intentionally server-backed from the start. Default to port `4004`, and treat dashboard edits as dual writes: update the canonical index and keep item-folder markdown plus static dashboard artifacts in sync.
- 2026-03-14: Capture-first is a hard rule. When the user brings an idea or concept, record it immediately — create the item, save raw input, reflect back what was heard. Probing questions come after the capture, not before. The user often drops thoughts in motion and needs them caught, not workshopped at the gate.
