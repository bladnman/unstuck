import fs from 'node:fs/promises';
import path from 'node:path';

import {
  buildDashboardMeta,
  buildSearchText,
  loadCanonicalIndex,
  parseIsoDate,
  todayIsoDate,
  writeCanonicalIndex,
  writeDashboardFiles,
} from '../../../../scripts/lib/unstuck_index.mjs';
import {
  extractIndexFieldsFromItemMarkdown,
  readItemDetail,
  syncItemDocumentFromIndex,
  writeItemDocument,
} from './itemDocuments.mjs';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `item-${Date.now()}`;
}

function normalizePatch(patch) {
  const nextPatch = { ...patch };

  if (typeof nextPatch.durationDays === 'string') {
    nextPatch.durationDays = Number(nextPatch.durationDays) || undefined;
  }
  if (typeof nextPatch.durationMinutes === 'string') {
    nextPatch.durationMinutes = Number(nextPatch.durationMinutes) || undefined;
  }
  if (typeof nextPatch.rank === 'string') {
    nextPatch.rank = Number(nextPatch.rank);
  }
  if (nextPatch.dueDate && !parseIsoDate(nextPatch.dueDate)) {
    delete nextPatch.dueDate;
  }
  if (nextPatch.plannedStart && !parseIsoDate(nextPatch.plannedStart)) {
    delete nextPatch.plannedStart;
  }
  if (
    nextPatch.fixedStartTime
    && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(nextPatch.fixedStartTime))
  ) {
    delete nextPatch.fixedStartTime;
  }
  if (
    typeof nextPatch.durationMinutes === 'number'
    && (!Number.isFinite(nextPatch.durationMinutes) || nextPatch.durationMinutes <= 0)
  ) {
    delete nextPatch.durationMinutes;
  }

  return nextPatch;
}

async function loadMutableIndex(home) {
  return loadCanonicalIndex(home, { allowMissing: true });
}

async function persistIndex(home, index) {
  const written = await writeCanonicalIndex(home, index);
  await writeDashboardFiles(home, written, { refreshShell: false });
  return written;
}

function buildNewItem(payload) {
  const id = slugify(payload.id || payload.title);
  const title = payload.title?.trim() || 'Untitled item';
  const summary = payload.summary?.trim() || 'Captured from the dynamic dashboard.';

  return {
    id,
    title,
    summary,
    state: payload.state || 'active',
    status: payload.status || 'Open',
    lastTouched: todayIsoDate(),
    createdAt: todayIsoDate(),
    kind: payload.kind || 'project',
    domains: Array.isArray(payload.domains) && payload.domains.length ? payload.domains : ['general'],
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    scope: payload.scope || 'small',
    path: `items/${id}/`,
    plannedStart: payload.plannedStart,
    fixedStartTime: payload.fixedStartTime,
    durationMinutes: payload.durationMinutes,
    durationDays: payload.durationDays,
    dueDate: payload.dueDate,
    scheduleMode: payload.scheduleMode,
    rank: typeof payload.rank === 'number' ? payload.rank : undefined,
    searchText: buildSearchText([title, summary, payload.status]),
  };
}

export async function getDashboardData(home) {
  const index = await loadMutableIndex(home);
  const dashboard = await buildDashboardMeta(home);

  return {
    ...index,
    dashboard,
    home,
  };
}

export async function createDashboardItem(home, payload) {
  const index = await loadMutableIndex(home);
  const item = buildNewItem(normalizePatch(payload));
  index.items = [...index.items, item];
  const written = await persistIndex(home, index);
  await writeItemDocument(
    item,
    home,
    `# ${item.title}

> ${item.summary}

## Understanding

Captured from the dynamic dashboard.

## Status

${item.status}
`,
  );
  await syncItemDocumentFromIndex(item, home);

  return written.items.find((entry) => entry.id === item.id);
}

export async function getDashboardItem(home, itemId) {
  const index = await loadMutableIndex(home);
  const item = index.items.find((entry) => entry.id === itemId);

  if (!item) {
    return null;
  }

  return readItemDetail(item, home);
}

export async function updateDashboardItem(home, itemId, patch) {
  const index = await loadMutableIndex(home);
  const nextPatch = normalizePatch(patch);
  const items = index.items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    const nextItem = {
      ...item,
      ...nextPatch,
      lastTouched: todayIsoDate(),
    };

    nextItem.searchText = buildSearchText([
      nextItem.id,
      nextItem.title,
      nextItem.summary,
      nextItem.status,
      nextItem.fixedStartTime,
      nextItem.durationMinutes,
      (nextItem.domains || []).join(' '),
      (nextItem.tags || []).join(' '),
    ]);

    return nextItem;
  });

  index.items = items;
  const written = await persistIndex(home, index);
  const updatedItem = written.items.find((item) => item.id === itemId);

  if (!updatedItem) {
    return null;
  }

  await syncItemDocumentFromIndex(updatedItem, home);
  return updatedItem;
}

export async function saveDashboardItemDocument(home, itemId, markdown) {
  const index = await loadMutableIndex(home);
  const item = index.items.find((entry) => entry.id === itemId);

  if (!item) {
    return null;
  }

  await fs.mkdir(path.join(home, item.path || `items/${item.id}`), { recursive: true });
  await writeItemDocument(item, home, markdown);

  const extracted = extractIndexFieldsFromItemMarkdown(markdown);
  if (extracted.title || extracted.summary || extracted.status) {
    await updateDashboardItem(home, itemId, {
      title: extracted.title || item.title,
      summary: extracted.summary || item.summary,
      status: extracted.status || item.status,
      searchText: extracted.searchText || item.searchText,
    });
  }

  return getDashboardItem(home, itemId);
}
