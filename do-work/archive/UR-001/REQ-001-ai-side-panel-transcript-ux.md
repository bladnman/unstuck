---
id: REQ-001
title: Tame AI side panel transcript UX
status: completed
created_at: 2026-03-15T23:19:12Z
user_request: UR-001
claimed_at: 2026-03-15T23:23:23Z
route: B
completed_at: 2026-03-15T23:32:06Z
---

# Tame AI Side Panel Transcript UX

## What
Improve the AI side panel experience so a session that technically works no longer feels "a bit crazy" in practice. Use the attached transcript as the concrete failure case.

## Detailed Requirements
- The UI must scroll to keep up with changes while output is streaming.
- Treat this as more than a single scroll bug; the user explicitly called out "many not-great experiences."
- Reduce the blast of startup/session text that appears before the useful answer.
- Repeated duplicate-tool MCP warnings should not dominate the visible transcript experience.
- Shell commands and shell results need readable separation instead of running together into hard-to-follow lines like `...in /Users/mmaher/code/unstuckexec...`.
- Internal operational warnings, such as the shell snapshot deletion error shown in the transcript, should not be surfaced as if they are normal user-facing conversation content.
- The feature currently "seems" to work, so the request is about making the interaction sane and readable, not about proving the core request/response path exists.
- Use the provided transcript as the baseline example when evaluating improvements.

## Constraints
- Preserve the full transcript in `UR-001/input.md` as the source of truth for what felt broken.
- Do not collapse this request into only one visible symptom; the transcript is evidence of a broader presentation problem.

## Builder Guidance
- Certainty level: Mixed. The user is clear that the current experience is bad, but did not prescribe a specific implementation.
- Scope cues: This is a polish-and-clarity request around a feature that "seems" to work already.
- Preserve the user's phrasing where it carries meaning: "a bit crazy", "seems", "does not scroll to to keep up with changes", and "many not-great experiences."

## Full Context
See [user-requests/UR-001/input.md](./user-requests/UR-001/input.md) for the complete verbatim input and transcript.

---
*Source: See UR-001/input.md for full verbatim input*

## Verification

**Source**: UR-001/input.md
**Pre-fix coverage**: 100% (9/9 items)
**Post-fix coverage**: 100% (9/9 items)

### Coverage Map

| # | Item | REQ Section | Status |
|---|------|-------------|--------|
| 1 | AI side panel is "a bit crazy" | What / Builder Guidance | Full |
| 2 | It "seems" to work | Detailed Requirements / Builder Guidance | Full |
| 3 | UI "does not scroll to to keep up with changes" | Detailed Requirements | Full |
| 4 | There are "many not-great experiences," not just one bug | Detailed Requirements / Constraints | Full |
| 5 | "Below is how it started" means the startup transcript itself is part of the problem | Detailed Requirements / Full Context | Full |
| 6 | Repeated duplicate-tool MCP warnings clutter the session transcript | Detailed Requirements / Full Context | Full |
| 7 | Internal shell snapshot cleanup warning is exposed in the transcript | Detailed Requirements / Full Context | Full |
| 8 | Shell commands and outputs are jammed together in hard-to-read lines | Detailed Requirements / Full Context | Full |
| 9 | The provided transcript is the reference case for the bad experience | What / Full Context | Full |

### Fixes Applied

- None. Initial capture covered all enumerated items from UR-001.

*Verified by verify-request action*

## Triage

**Route: B** - Medium

**Reasoning:** The outcome is clear and bounded to the AI side-panel experience, but the fix spans both transcript generation and transcript rendering. The code paths had to be located first, and the request calls for coordinated polish across several symptoms rather than a single named-file tweak.

## Plan

1. Trace the AI transcript pipeline across `apps/unstuck-dashboard/server/ai/cliSessionManager.mjs`, `apps/unstuck-dashboard/src/types/unstuck.ts`, and the AI panel UI so transcript entries can carry enough structure to distinguish conversation, tool activity, and operational notices without altering `UR-001/input.md`.
2. Normalize streamed CLI output in `apps/unstuck-dashboard/server/ai/cliSessionManager.mjs`: keep the useful answer readable, split command invocations from their results, collapse repeated MCP startup noise, and suppress internal operational warnings like the shell snapshot deletion message from the main user-facing transcript while preserving the working request/response path.
3. Update `apps/unstuck-dashboard/src/pages/DashboardPage/features/AiPanel/AiPanel.tsx`, `apps/unstuck-dashboard/src/pages/DashboardPage/features/AiPanel/AiPanel.module.css`, and related hook/type code so the transcript auto-scrolls during streaming unless the user has intentionally scrolled away, and so different transcript entry kinds render with clearer spacing and lighter treatment for demoted system chatter.
4. Validate the result against the baseline transcript captured in `do-work/user-requests/UR-001/input.md`, then run the dashboard checks/build to confirm the session still streams and renders cleanly.

*Generated locally during work action*

## Plan Verification

**Source**: REQ-001 (10 items enumerated)
**Pre-fix coverage**: 95% (9 full, 1 partial, 0 missing)
**Post-fix coverage**: 100% (10/10 items addressed)

### Coverage Map

| # | Requirement | Plan Step | Status |
|---|-------------|-----------|--------|
| 1 | Keep the UI scrolled while output is streaming | Step 3 | Full |
| 2 | Treat this as a broader presentation problem, not one bug | Steps 1-3 | Full |
| 3 | Reduce the blast of startup/session text before the useful answer | Step 2 | Full |
| 4 | Prevent repeated duplicate-tool MCP warnings from dominating the transcript | Step 2 | Full |
| 5 | Separate shell commands and shell results so they are readable | Step 2 | Full |
| 6 | Do not surface internal operational warnings like shell snapshot deletion as normal conversation | Step 2 | Full |
| 7 | Preserve the fact that the feature already works and avoid breaking the core request/response path | Step 2 | Full |
| 8 | Use the provided transcript as the baseline evaluation case | Step 4 | Full |
| 9 | Preserve `UR-001/input.md` as the source of truth | Step 1 | Full |
| 10 | Avoid collapsing the request into only one visible symptom | Step 2 was broad but did not explicitly mention cross-layer evaluation | Partial -> Fixed |

### Fixes Applied

- Expanded Step 3 to cover transcript rendering treatment for multiple entry kinds and demoted chatter, making the plan explicitly broader than a single scroll fix.

*Verified by verify-plan action*

## Exploration

- `apps/unstuck-dashboard/server/ai/cliSessionManager.mjs` currently creates one user entry and one assistant entry, then appends both `stdout` and `stderr` directly into the assistant markdown content. That is why startup warnings, shell snapshot noise, commands, command output, and the real answer all run together.
- `codex exec --json` is available locally and emits structured `agent_message` and `command_execution` events on `stdout`, while duplicate-tool and shell-snapshot warnings still arrive on `stderr`. That gives us a cleaner separation point than trying to parse one large text blob after the fact.
- `apps/unstuck-dashboard/src/pages/DashboardPage/features/AiPanel/AiPanel.tsx` and `AiPanel.module.css` render every transcript entry the same way, with no auto-scroll logic and no special treatment for command entries or internal notices.
- `apps/unstuck-dashboard/src/pages/DashboardPage/hooks/useDashboardPage.ts` already receives live session snapshots over SSE, so transcript structure and scroll behavior can be improved without changing the transport layer.

*Generated locally during work action*

## Implementation Summary

- Switched the Codex CLI bridge in `apps/unstuck-dashboard/server/ai/cliSessionManager.mjs` to `codex exec --json`, so assistant messages and command executions are captured as structured transcript entries instead of one mixed markdown blob.
- Added transcript notices for repeated duplicate-tool warnings and shell snapshot cleanup warnings, keeping those internal lines out of the main conversation while still making their suppression visible in a compact form.
- Expanded AI session and transcript types in `apps/unstuck-dashboard/src/types/unstuck.ts` so the UI can distinguish normal messages, command blocks, errors, and suppressed notices.
- Reworked `apps/unstuck-dashboard/src/pages/DashboardPage/features/AiPanel/AiPanel.tsx` and `AiPanel.module.css` to auto-stick the transcript to the bottom during streaming unless the user scrolls away, show compact notice pills, and render shell commands plus outputs as separate readable blocks.
- Capped command-output panes visually so startup/tool output no longer blasts through the whole transcript, while preserving the underlying content for inspection.

## Testing

- `npm run check` in `apps/unstuck-dashboard`
- `npm run build` in `apps/unstuck-dashboard`
- Smoke-tested `CliSessionManager` with a minimal Codex prompt (`Reply with exactly: hi`) and confirmed a clean user/assistant transcript plus suppressed-warning notices.
- Smoke-tested `CliSessionManager` with a Codex prompt that triggered shell usage and confirmed separate `command` transcript entries with exit status and isolated output content.

*Tested locally during work action*
