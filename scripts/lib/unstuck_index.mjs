import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DASHBOARD_TEMPLATE = path.join(REPO_ROOT, 'assets', 'dashboard-template.html');

export const STATE_ORDER = ['active', 'simmering', 'parked', 'archived', 'resolved'];

export async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export function titleFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

export function plainText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^>\s*/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/[*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchText(parts) {
  return (parts || [])
    .filter(Boolean)
    .map((value) => plainText(String(value)))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerptText(value, maxLength = 220) {
  const text = plainText(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function parseIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export function parseDateValue(value) {
  if (!parseIsoDate(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function compareIsoDates(left, right) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

export function normalizeDurationDays(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function normalizeScheduleMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if ([
    'weekdays',
    'weekday-only',
    'weekday_only',
    'business-days',
    'business_days',
  ].includes(normalized)) {
    return 'weekdays';
  }

  if ([
    'all-days',
    'all_days',
    'any-day',
    'any_day',
    'daily',
    'everyday',
  ].includes(normalized)) {
    return 'all-days';
  }

  return undefined;
}

export function isWeekendDate(date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function moveToScheduledDate(date, scheduleMode, direction = 1) {
  const normalized = normalizeScheduleMode(scheduleMode) || 'all-days';
  const step = direction < 0 ? -1 : 1;
  const result = new Date(date.getTime());

  if (normalized !== 'weekdays') {
    return result;
  }

  while (isWeekendDate(result)) {
    result.setUTCDate(result.getUTCDate() + step);
  }

  return result;
}

export function collectScheduledDates(startDate, durationDays, scheduleMode) {
  const total = normalizeDurationDays(durationDays) || 0;
  if (!startDate || !total) {
    return [];
  }

  const normalized = normalizeScheduleMode(scheduleMode) || 'all-days';
  const dates = [];
  let cursor = moveToScheduledDate(startDate, normalized);

  while (dates.length < total) {
    if (normalized !== 'weekdays' || !isWeekendDate(cursor)) {
      dates.push(new Date(cursor.getTime()));
    }

    cursor = addUtcDays(cursor, 1);
    if (normalized === 'weekdays') {
      cursor = moveToScheduledDate(cursor, normalized);
    }
  }

  return dates;
}

export function lastScheduledDate(startDate, durationDays, scheduleMode) {
  const dates = collectScheduledDates(startDate, durationDays, scheduleMode);
  if (dates.length) {
    return dates[dates.length - 1];
  }
  return moveToScheduledDate(startDate, scheduleMode);
}

export function latestScheduledStart(dueDate, durationDays, scheduleMode) {
  const total = normalizeDurationDays(durationDays) || 1;
  const normalized = normalizeScheduleMode(scheduleMode) || 'all-days';
  let cursor = moveToScheduledDate(dueDate, normalized, -1);
  let remaining = total - 1;

  while (remaining > 0) {
    cursor = addUtcDays(cursor, -1);
    cursor = moveToScheduledDate(cursor, normalized, -1);
    remaining -= 1;
  }

  return cursor;
}

function incrementCount(target, key) {
  target[key] = (target[key] || 0) + 1;
}

export function buildFacets(items) {
  const stateCounts = {};
  const domainCounts = {};
  const kindCounts = {};
  const scopeCounts = {};

  for (const item of items) {
    incrementCount(stateCounts, item.state);
    incrementCount(kindCounts, item.kind);
    incrementCount(scopeCounts, item.scope);
    for (const domain of item.domains || []) {
      incrementCount(domainCounts, domain);
    }
  }

  return { stateCounts, domainCounts, kindCounts, scopeCounts };
}

export function sortItems(items) {
  const order = new Map(STATE_ORDER.map((state, index) => [state, index]));
  return [...items].sort((left, right) => {
    const stateDelta = (order.get(left.state) ?? 999) - (order.get(right.state) ?? 999);
    if (stateDelta !== 0) {
      return stateDelta;
    }

    const leftRank = Number.isFinite(left.rank) ? left.rank : null;
    const rightRank = Number.isFinite(right.rank) ? right.rank : null;
    if (leftRank !== null && rightRank !== null && leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    if (leftRank !== null && rightRank === null) {
      return -1;
    }
    if (leftRank === null && rightRank !== null) {
      return 1;
    }

    const leftEphemeral = Boolean(left.ephemeral);
    const rightEphemeral = Boolean(right.ephemeral);
    if (leftEphemeral !== rightEphemeral) {
      return leftEphemeral ? -1 : 1;
    }

    const leftExpires = parseIsoDate(left.expiresOn) || parseIsoDate(left.dueDate);
    const rightExpires = parseIsoDate(right.expiresOn) || parseIsoDate(right.dueDate);
    if (leftExpires && rightExpires && leftExpires !== rightExpires) {
      return compareIsoDates(leftExpires, rightExpires);
    }
    if (leftExpires && !rightExpires) {
      return -1;
    }
    if (!leftExpires && rightExpires) {
      return 1;
    }

    if (left.lastTouched !== right.lastTouched) {
      return left.lastTouched > right.lastTouched ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });
}

export function estimateDurationDays(item) {
  const normalized = normalizeDurationDays(item.durationDays);
  if (normalized) {
    return normalized;
  }

  if (item.kind === 'concern') {
    return 1;
  }
  if (item.kind === 'backlog') {
    return 2;
  }
  if (item.kind === 'infrastructure') {
    return item.scope === 'large' ? 4 : 2;
  }
  if (item.kind === 'video') {
    if (item.scope === 'large') {
      return 5;
    }
    if (item.scope === 'small') {
      return 2;
    }
    return 3;
  }
  if (item.scope === 'large') {
    return 10;
  }
  if (item.scope === 'medium') {
    return 4;
  }
  return 2;
}

function comparePlanningPriority(left, right) {
  if (left.dueDate && right.dueDate && left.dueDate !== right.dueDate) {
    return compareIsoDates(left.dueDate, right.dueDate);
  }
  if (left.dueDate && !right.dueDate) {
    return -1;
  }
  if (!left.dueDate && right.dueDate) {
    return 1;
  }
  if (left.lastTouched !== right.lastTouched) {
    return left.lastTouched > right.lastTouched ? -1 : 1;
  }
  return left.id.localeCompare(right.id);
}

export function buildPlanningNote(item, hasDueDate) {
  if (hasDueDate) {
    return 'Auto-seeded as an optimistic working window from the due date and current scope. Revise it when the real sequence gets clearer.';
  }
  if (item.state === 'active') {
    return 'Auto-seeded as the next plausible push based on current state and scope. Revise it when the real sequence gets clearer.';
  }
  return 'Auto-seeded as a later optimistic pass so the index keeps a visible working plan. Revise it when timing firms up.';
}

export function backfillOptimisticPlanning(items, referenceDate) {
  const today = parseDateValue(referenceDate) ?? parseDateValue(todayIsoDate());
  const nextItems = items.map((item) => ({ ...item }));
  let changed = false;

  const seeds = [
    { state: 'active', scheduleMode: 'all-days', cursor: today },
    { state: 'active', scheduleMode: 'weekdays', cursor: today },
    { state: 'simmering', scheduleMode: 'all-days', cursor: addUtcDays(today, 7) },
    { state: 'simmering', scheduleMode: 'weekdays', cursor: addUtcDays(today, 7) },
  ];

  for (const seed of seeds) {
    const pending = nextItems
      .filter((item) => item.state === seed.state)
      .filter((item) => (normalizeScheduleMode(item.scheduleMode) || 'all-days') === seed.scheduleMode)
      .filter((item) => !parseIsoDate(item.plannedStart) || !normalizeDurationDays(item.durationDays))
      .sort(comparePlanningPriority);

    for (const item of pending) {
      const durationDays = estimateDurationDays(item);
      const dueDate = parseDateValue(item.dueDate);
      const scheduleMode = normalizeScheduleMode(item.scheduleMode) || 'all-days';
      let startDate = parseDateValue(item.plannedStart) ?? seed.cursor;
      startDate = moveToScheduledDate(startDate, scheduleMode);

      if (!parseDateValue(item.plannedStart) && dueDate) {
        const latestStart = latestScheduledStart(dueDate, durationDays, scheduleMode);
        if (latestStart < startDate) {
          startDate = latestStart;
        }
      }

      if (startDate < today) {
        startDate = today;
      }
      startDate = moveToScheduledDate(startDate, scheduleMode);

      const plannedStart = formatIsoDate(startDate);
      if (item.plannedStart !== plannedStart) {
        item.plannedStart = plannedStart;
        changed = true;
      }
      if (item.durationDays !== durationDays) {
        item.durationDays = durationDays;
        changed = true;
      }
      if (!item.planningMode) {
        item.planningMode = 'optimistic';
        changed = true;
      }
      if (!item.planningNote) {
        item.planningNote = buildPlanningNote(item, Boolean(dueDate));
        changed = true;
      }

      const finalDate = lastScheduledDate(startDate, durationDays, scheduleMode);
      seed.cursor = moveToScheduledDate(addUtcDays(finalDate, 1), seed.scheduleMode);
    }
  }

  return { items: nextItems, changed };
}

function normalizeItem(item) {
  const scheduleMode = normalizeScheduleMode(item.scheduleMode);
  return {
    ...item,
    state: (item.state || 'simmering').toLowerCase(),
    domains: uniq(Array.isArray(item.domains) ? item.domains : []),
    tags: uniq(Array.isArray(item.tags) ? item.tags : []).sort(),
    connections: uniq(Array.isArray(item.connections) ? item.connections : []).sort(),
    plannedStart: parseIsoDate(item.plannedStart) || undefined,
    durationDays: normalizeDurationDays(item.durationDays) || undefined,
    scheduleMode,
  };
}

export function normalizeIndex(index) {
  const today = todayIsoDate();
  const lastUpdated = parseIsoDate(index.lastUpdated) || today;
  const normalizedItems = (index.items || []).map(normalizeItem);
  const planning = backfillOptimisticPlanning(normalizedItems, lastUpdated);
  const items = sortItems(planning.items);

  return {
    schemaVersion: 1,
    lastUpdated: planning.changed ? today : lastUpdated,
    items,
    facets: buildFacets(items),
  };
}

function extractMarkdownSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`##\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
  const match = String(markdown || '').match(pattern);
  return match ? match[1].trim() : '';
}

function countMarkdownBullets(markdown) {
  return String(markdown || '')
    .split('\n')
    .filter((line) => /^\s*-\s+/.test(line))
    .length;
}

function parseFrontmatter(markdown) {
  const match = String(markdown || '').match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return {};
  }

  const meta = {};
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    meta[key] = value;
  }
  return meta;
}

async function collectRecentSessions(home, limit = 4) {
  const sessionsDir = path.join(home, 'sessions');
  if (!await exists(sessionsDir)) {
    return { sessionCount: 0, recentSessions: [] };
  }

  const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
  const sessions = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const sessionPath = path.join(sessionsDir, entry.name, 'SESSION.md');
    if (!await exists(sessionPath)) {
      continue;
    }

    const [markdown, stats] = await Promise.all([
      fs.readFile(sessionPath, 'utf8'),
      fs.stat(sessionPath),
    ]);
    const whatWeCovered = extractMarkdownSection(markdown, 'What We Covered');
    const itemsTouched = extractMarkdownSection(markdown, 'Items Touched');
    const rawInputs = extractMarkdownSection(markdown, 'Raw Inputs');

    sessions.push({
      id: entry.name,
      path: `sessions/${entry.name}/SESSION.md`,
      updatedAt: formatIsoDate(stats.mtime),
      updatedAtMs: stats.mtimeMs,
      summary: excerptText(whatWeCovered, 240),
      itemsTouchedCount: countMarkdownBullets(itemsTouched),
      rawInputCount: countMarkdownBullets(rawInputs),
    });
  }

  sessions.sort((left, right) => right.updatedAtMs - left.updatedAtMs);

  return {
    sessionCount: sessions.length,
    recentSessions: sessions.slice(0, limit).map(({ updatedAtMs, ...session }) => session),
  };
}

async function collectRecentMemory(home, limit = 6) {
  const memoryDir = path.join(home, 'memory');
  if (!await exists(memoryDir)) {
    return { memoryCount: 0, recentMemory: [] };
  }

  const entries = await fs.readdir(memoryDir, { withFileTypes: true });
  const memoryFiles = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'MEMORY.md') {
      continue;
    }

    const filePath = path.join(memoryDir, entry.name);
    const [markdown, stats] = await Promise.all([
      fs.readFile(filePath, 'utf8'),
      fs.stat(filePath),
    ]);
    const frontmatter = parseFrontmatter(markdown);
    const title = frontmatter.name || titleFromSlug(entry.name.replace(/\.md$/i, ''));

    memoryFiles.push({
      id: entry.name.replace(/\.md$/i, ''),
      title,
      description: frontmatter.description || '',
      type: frontmatter.type || '',
      path: `memory/${entry.name}`,
      updatedAt: formatIsoDate(stats.mtime),
      updatedAtMs: stats.mtimeMs,
    });
  }

  memoryFiles.sort((left, right) => right.updatedAtMs - left.updatedAtMs);

  return {
    memoryCount: memoryFiles.length,
    recentMemory: memoryFiles.slice(0, limit).map(({ updatedAtMs, ...memory }) => memory),
  };
}

export async function buildDashboardMeta(home) {
  const [sessionMeta, memoryMeta] = await Promise.all([
    collectRecentSessions(home),
    collectRecentMemory(home),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    sessionCount: sessionMeta.sessionCount,
    memoryCount: memoryMeta.memoryCount,
    recentSessions: sessionMeta.recentSessions,
    recentMemory: memoryMeta.recentMemory,
  };
}

function buildDefaultItem(itemId, queueDate) {
  return {
    id: itemId,
    title: titleFromSlug(itemId),
    summary: '',
    state: 'simmering',
    status: 'Open',
    lastTouched: queueDate,
    createdAt: queueDate,
    kind: 'project',
    domains: ['general'],
    tags: [],
    scope: 'small',
    path: `items/${itemId}/`,
    connections: [],
  };
}

export function applyIndexDelta(index, delta) {
  const queueDate = parseIsoDate(String(delta.createdAt || '').slice(0, 10)) || todayIsoDate();
  const itemId = delta.itemId;
  if (!itemId) {
    throw new Error('Queue delta is missing itemId');
  }

  const operation = delta.operation || 'upsert';
  const next = {
    ...index,
    items: [...(index.items || [])],
    lastUpdated: queueDate,
  };
  const existingIndex = next.items.findIndex((item) => item.id === itemId);

  if (operation === 'delete' || operation === 'remove') {
    if (existingIndex !== -1) {
      next.items.splice(existingIndex, 1);
    }
    return next;
  }

  const patch = delta.patch;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error(`Queue delta for ${itemId} is missing a valid patch object`);
  }
  if (patch.id && patch.id !== itemId) {
    throw new Error(`Queue delta id mismatch for ${itemId}`);
  }

  const existing = existingIndex === -1 ? null : next.items[existingIndex];
  const merged = {
    ...(existing || buildDefaultItem(itemId, queueDate)),
    ...patch,
    id: itemId,
  };

  merged.title = merged.title || titleFromSlug(itemId);
  merged.path = merged.path || existing?.path || `items/${itemId}/`;
  merged.summary = merged.summary || merged.teaser || existing?.summary || '';
  merged.status = merged.status || existing?.status || 'Open';
  merged.state = (merged.state || existing?.state || 'simmering').toLowerCase();
  merged.createdAt = parseIsoDate(merged.createdAt) || existing?.createdAt || queueDate;
  merged.lastTouched = parseIsoDate(merged.lastTouched) || existing?.lastTouched || queueDate;
  merged.kind = merged.kind || existing?.kind || 'project';
  merged.scope = merged.scope || existing?.scope || 'small';

  const domains = Array.isArray(merged.domains) ? merged.domains : (existing?.domains || ['general']);
  merged.domains = uniq(domains);
  if (!merged.domains.length) {
    merged.domains = ['general'];
  }

  merged.tags = uniq(Array.isArray(merged.tags) ? merged.tags : (existing?.tags || [])).sort();
  merged.connections = uniq(
    Array.isArray(merged.connections) ? merged.connections : (existing?.connections || []),
  ).sort();

  if (!merged.searchText) {
    merged.searchText = buildSearchText([
      merged.id,
      merged.title,
      merged.summary,
      merged.status,
      merged.teaser,
      merged.statusDetail,
      (merged.domains || []).join(' '),
      (merged.tags || []).join(' '),
    ]);
  }

  if (existingIndex === -1) {
    next.items.push(merged);
  } else {
    next.items[existingIndex] = merged;
  }

  return next;
}

export async function loadCanonicalIndex(home, options = {}) {
  const canonicalPath = path.join(home, 'index.json');
  if (!await exists(canonicalPath)) {
    if (options.allowMissing) {
      return normalizeIndex({ schemaVersion: 1, lastUpdated: todayIsoDate(), items: [] });
    }
    throw new Error(`No canonical index found in ${home}`);
  }

  const raw = JSON.parse(await fs.readFile(canonicalPath, 'utf8'));
  return normalizeIndex(raw);
}

export async function writeCanonicalIndex(home, index) {
  const normalized = normalizeIndex(index);
  const canonicalPath = path.join(home, 'index.json');
  await fs.writeFile(canonicalPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

export async function writeDashboardFiles(home, index, options = {}) {
  const refreshShell = options.refreshShell ?? true;
  const normalized = normalizeIndex(index);
  const dashboard = await buildDashboardMeta(home);
  const dashboardHtmlPath = path.join(home, 'dashboard.html');
  const dashboardDataPath = path.join(home, 'dashboard-data.js');
  const payload = {
    ...normalized,
    dashboard,
  };

  if (refreshShell || !await exists(dashboardHtmlPath)) {
    await fs.copyFile(DASHBOARD_TEMPLATE, dashboardHtmlPath);
  }

  await fs.writeFile(
    dashboardDataPath,
    `window.UNSTUCK_DATA = ${JSON.stringify(payload, null, 2)};\n`,
    'utf8',
  );

  return payload;
}
