# Version Action

> **Part of the unstuck skill.** Handles version reporting and update checks.

**Current version**: 0.3.0

When the user asks for `/unstuck version`, use the version number on the line above as the skill version.

Important:
- Do **not** derive the skill version from `index.json` or its `schemaVersion`.
- `schemaVersion` is the data format version, not the skill version.
- If `dashboard-data.js` exists, only report the dashboard as healthy if it is in sync with `index.json`.
- If `dashboard-data.js` is out of sync with `index.json`, say explicitly that the dashboard is stale and needs regeneration from the canonical index.

Suggested check sequence:
1. Resolve `UNSTUCK_HOME`.
2. Read `actions/version.md` and extract `**Current version**: X.Y.Z`.
3. Read `UNSTUCK_HOME/index.json` if it exists and report:
   - item count
   - counts by state if available
   - schema version
4. Count session folders and memory files if they exist.
5. If `dashboard.html` and `dashboard-data.js` exist:
   - parse `dashboard-data.js` from `window.UNSTUCK_DATA = ...;`
   - compare it to `index.json`
   - report `fresh` only if the data matches the current canonical index
   - otherwise report `stale` and tell the user to regenerate the dashboard companion from `index.json`

Suggested output shape:

```text
Unstuck — vX.Y.Z

UNSTUCK_HOME: /path/to/unstuck
Items tracked: N (...)
Sessions: N
Memory files: N
Schema version: N
Dashboard: fresh | stale | missing
```
