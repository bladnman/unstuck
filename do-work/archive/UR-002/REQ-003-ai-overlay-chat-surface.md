---
id: REQ-003
title: Rethink AI chat surface beyond fixed sidebar
status: completed
created_at: 2026-03-15T23:21:43Z
user_request: UR-002
related: [REQ-001, REQ-002]
batch: dashboard-panel-layout
claimed_at: 2026-03-15T23:37:39Z
route: B
completed_at: 2026-03-15T23:39:11Z
---

# Rethink AI Chat Surface Beyond Fixed Sidebar

## What
Reconsider the AI chat presentation so it is not boxed into a narrow sidebar. Explore a roomier surface, such as an overlay chat panel, while keeping it coordinated with the rest of the dashboard layout.

## Detailed Requirements
- The current AI sidebar is too constraining.
- Consider an overlay chat panel or similar surface that gives the AI conversation more space.
- Treat the overlay idea as exploratory guidance rather than a mandated implementation.
- Consider this alongside the item-details surface, since both currently compete for sidebar real estate.
- Keep this request distinct from REQ-001, which already covers transcript readability and streaming-output quality.

## Builder Guidance
- Certainty level: Exploratory.
- Scope cues: The user is signaling dissatisfaction with the current layout constraint, not dictating a finalized design.
- Preserve the user's phrasing where it matters: the AI "side bar" "constrains things a bit too" and "maybe an overlay chat panel or something."

## Full Context
See [user-requests/UR-002/input.md](./user-requests/UR-002/input.md) for the complete verbatim input.

---
*Source: See UR-002/input.md for full verbatim input*

## Verification

**Source**: UR-002/input.md
**Pre-fix coverage**: 100% (3/3 items)
**Post-fix coverage**: 100% (3/3 items)

### Coverage Map

| # | Item | REQ Section | Status |
|---|------|-------------|--------|
| 1 | The AI sidebar constrains the experience | What / Detailed Requirements | Full |
| 2 | "Maybe an overlay chat panel or something" is the proposed direction | What / Detailed Requirements / Builder Guidance | Full |
| 3 | The AI surface issue is about layout room and panel competition, not just transcript formatting | Detailed Requirements | Full |

### Fixes Applied

- None. Initial capture covered all enumerated items relevant to REQ-003.

*Verified by verify-request action*

## Triage

**Route: B** - Medium

**Reasoning:** The request is exploratory, but the code touch points are already localized now that REQ-002 moved item details out of the rail. This is primarily a layout/surface change that needs to stay coordinated with the existing dashboard shell and the recently added detail popup.

## Plan

1. Rework `apps/unstuck-dashboard/src/pages/DashboardPage/DashboardPage.tsx` and `DashboardPage.module.css` so the AI chat no longer renders as a fixed sidebar/rail surface and instead opens into a roomier overlay panel that can coexist cleanly with the dashboard workspace.
2. Keep the rail as a lighter launch/status area for the AI surface, with close/open controls and copy that makes the overlay behavior obvious instead of leaving the conversation boxed into the narrow column.
3. Preserve the existing AI session, transcript, and streaming UX from REQ-001 by leaving `AiPanel.tsx` focused on conversation content while only changing the surrounding surface and launch affordances.
4. Update the dashboard header copy/button language as needed to match the new overlay treatment, then run the dashboard checks/build to confirm the surface refactor still compiles cleanly.

*Generated locally during work action*

## Plan Verification

**Source**: REQ-003 (7 items enumerated)
**Pre-fix coverage**: 100% (7 full, 0 partial, 0 missing)
**Post-fix coverage**: 100% (7/7 items addressed)

### Coverage Map

| # | Requirement | Plan Step | Status |
|---|-------------|-----------|--------|
| 1 | The current AI sidebar is too constraining | Steps 1 and 2 | Full |
| 2 | Consider an overlay chat panel or similar roomier surface | Step 1 | Full |
| 3 | Treat the overlay idea as exploratory guidance, not a rigid mandate | Steps 1 and 2 | Full |
| 4 | Consider AI surface changes alongside the detail-surface competition for sidebar space | Steps 1 and 2 | Full |
| 5 | Keep this request distinct from REQ-001 transcript/readability work | Step 3 | Full |
| 6 | Preserve the exploratory certainty level and layout-driven scope | Steps 1-3 | Full |
| 7 | Preserve the user's phrasing around the AI sidebar constraining things | Steps 1 and 4 | Full |

### Fixes Applied

- None. The initial plan already covered the layout constraint, the overlay direction, the coordination with the detail surface, and the scope boundary relative to REQ-001.

*Verified by verify-plan action*

## Exploration

- After REQ-002, item details already open in their own popup surface, which means the rail no longer needs to carry two heavyweight experiences at once.
- `DashboardPage.tsx` still renders the full `AiPanel` directly inside the rail when `panelMode === 'ai'`, so the conversation remains constrained by the rail width even though the transcript behavior itself is now cleaner.
- The existing AI open affordance lives in `DashboardHeader.tsx` and already routes through `setPanelMode('ai')`, which gives a straightforward launch hook for an overlay treatment without changing session logic.
- `AiPanel.tsx` already behaves like a self-contained conversation surface, so this request can stay focused on the surrounding container and launch/close affordances rather than rewriting the AI internals again.

*Generated locally during work action*

## Implementation Summary

- Updated `apps/unstuck-dashboard/src/pages/DashboardPage/DashboardPage.tsx` so the rail no longer hosts the full AI conversation surface; it now acts as a smaller AI status/launch dock while the actual `AiPanel` opens in a dedicated overlay.
- Added right-side overlay treatment in `DashboardPage.module.css` so the AI surface has materially more room than the old sidebar while still feeling connected to the dashboard shell.
- Kept `AiPanel.tsx` itself untouched for transcript/session behavior, preserving the REQ-001 readability work and keeping this request focused on layout.
- Updated `DashboardHeader.tsx` button copy from “Open AI side panel” to “Open AI overlay” so the primary affordance matches the new presentation.

## Testing

- `npm run check` in `apps/unstuck-dashboard`
- `npm run build` in `apps/unstuck-dashboard`
- No dedicated UI automation or component test harness is present in this app yet, so the overlay behavior is validated at compile/build level only in this request.

*Tested locally during work action*
