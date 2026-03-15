---
id: REQ-002
title: Fix item detail selection and rethink detail surface
status: completed
created_at: 2026-03-15T23:21:43Z
user_request: UR-002
related: [REQ-003]
batch: dashboard-panel-layout
claimed_at: 2026-03-15T23:32:53Z
route: B
completed_at: 2026-03-15T23:36:38Z
---

# Fix Item Detail Selection And Rethink Detail Surface

## What
Fix the broken item-detail interaction so selecting a dashboard tile actually shows that item's details. Also evaluate whether item details should live in a popup or modal instead of the current sidebar treatment.

## Detailed Requirements
- Selecting an item tile must populate the details view for that item.
- The current behavior is broken: item selection does not populate the sidebar details.
- Consider a popup, modal, or similar dedicated surface for item details instead of relying on the sidebar.
- Treat the popup idea as a design direction to evaluate, not a hard requirement for a specific component choice.
- If the details remain in a sidebar, the existing populate-on-select behavior still needs to work reliably.

## Builder Guidance
- Certainty level: Mixed. The broken selection behavior is firm; the popup suggestion is exploratory.
- Scope cues: This is partly a bug report and partly a UI-direction request.
- Preserve the user's phrasing where it matters: "select an item (tile)", "does not populate the side bar details", and "consider a popup for the details."

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
| 1 | Selecting an item tile does not populate the detail sidebar | What / Detailed Requirements | Full |
| 2 | The details surface may need to change, not just the data binding | What / Detailed Requirements | Full |
| 3 | "Consider a popup for the details" is an exploratory direction | Detailed Requirements / Builder Guidance | Full |

### Fixes Applied

- None. Initial capture covered all enumerated items relevant to REQ-002.

*Verified by verify-request action*

## Triage

**Route: B** - Medium

**Reasoning:** The data layer already appears intact, so this is not a backend repair. The work is a coordinated client-side fix across selection state and detail presentation, with an exploratory popup/modal direction that still needs to stay bounded and distinct from the separate AI-surface request.

## Plan

1. Trace the current detail-selection flow in `apps/unstuck-dashboard/src/pages/DashboardPage/DashboardPage.tsx` and `hooks/useDashboardPage.ts`, then keep tile selection tied to an explicit detail-open state so selecting an item reliably opens a visible detail surface.
2. Rework the item-detail presentation away from the passive sidebar treatment into a popup/modal-style surface in the dashboard page layout and CSS, while leaving the AI side panel in place so REQ-002 stays distinct from the AI overlay work in REQ-003.
3. Make `apps/unstuck-dashboard/src/pages/DashboardPage/features/ItemDetailPanel/ItemDetailPanel.tsx` render immediately from the selected item shell and then hydrate with the fetched detail document/context, so users see the selected item right away instead of an apparently empty side area.
4. Verify item selection from the existing views still routes into the detail surface, then run the dashboard checks/build to confirm the new surface and selection behavior compile cleanly.

*Generated locally during work action*

## Plan Verification

**Source**: REQ-002 (8 items enumerated)
**Pre-fix coverage**: 100% (8 full, 0 partial, 0 missing)
**Post-fix coverage**: 100% (8/8 items addressed)

### Coverage Map

| # | Requirement | Plan Step | Status |
|---|-------------|-----------|--------|
| 1 | Selecting a tile must populate the detail view | Steps 1 and 3 | Full |
| 2 | The current behavior is broken and needs a real fix | Step 1 | Full |
| 3 | Consider a popup/modal or similar dedicated surface | Step 2 | Full |
| 4 | Treat the popup direction as exploratory, not a rigid component mandate | Step 2 | Full |
| 5 | If details stay sidebar-based, populate-on-select still must work | Steps 1 and 3 | Full |
| 6 | Preserve the mixed certainty: bug fix is firm, surface direction is exploratory | Steps 1-3 | Full |
| 7 | Preserve the user’s wording around selecting a tile and sidebar details | Steps 1 and 2 | Full |
| 8 | Keep this request separate from the AI surface rethink in REQ-003 | Step 2 | Full |

### Fixes Applied

- None. The initial plan already covered the broken selection behavior, the popup/modal evaluation, and the scope boundary relative to REQ-003.

*Verified by verify-plan action*

## Exploration

- The dashboard already wires every view's item click into `setSelectedItemId(itemId)` and `setPanelMode('details')` in `apps/unstuck-dashboard/src/pages/DashboardPage/DashboardPage.tsx`, so the selection intent path exists.
- The detail API path is healthy: `apps/unstuck-dashboard/server/data/dashboardRepository.mjs#getDashboardItem()` resolves real item detail successfully from the canonical data store, which means the reported break is not in the repository layer.
- The existing detail surface depends on a sticky rail/sidebar in `DashboardPage.module.css`. On narrower layouts that rail drops below the main workspace, and even on wide layouts it is visually detached enough that selecting a tile can feel like nothing happened.
- `ItemDetailPanel.tsx` currently renders only after the full detail payload arrives, so there is no immediate selected-item shell confirming that the click worked.

*Generated locally during work action*

## Implementation Summary

- Hardened `apps/unstuck-dashboard/src/pages/DashboardPage/hooks/useDashboardPage.ts` so item-detail fetches are request-aware, stale responses cannot overwrite a newer selection, and item detail open/close behavior is explicit instead of spread across multiple click handlers.
- Reworked `apps/unstuck-dashboard/src/pages/DashboardPage/DashboardPage.tsx` and `DashboardPage.module.css` so selecting an item opens a dedicated modal-style detail surface, while the rail becomes a smaller status/direction area instead of the only place details might appear.
- Updated `apps/unstuck-dashboard/src/pages/DashboardPage/features/ItemDetailPanel/ItemDetailPanel.tsx` and its CSS so the selected item shell appears immediately, the panel shows loading feedback while markdown/context hydrate, and markdown saving is disabled until the initial document is present.
- Kept this change scoped to item details only; the AI panel remains in the rail and is still left for REQ-003's separate surface rethink.

## Testing

- `npm run check` in `apps/unstuck-dashboard`
- `npm run build` in `apps/unstuck-dashboard`
- Repository smoke check via `getDashboardItem()` against real `UNSTUCK_HOME` data confirmed the detail payload exists server-side, which narrowed the fix to the client interaction/surface layer.
- No dedicated UI automation or component test harness is present in this app yet, so there is no automated click-path regression test for the modal detail flow.

*Tested locally during work action*
