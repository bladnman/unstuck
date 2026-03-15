import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  applyIndexDelta,
  exists,
  loadCanonicalIndex,
  normalizeIndex,
  writeCanonicalIndex,
  writeDashboardFiles,
} from './unstuck_index.mjs';

export const INDEX_QUEUE_RELATIVE_DIR = path.join('.work-queue', 'index');

export function indexQueueDir(home) {
  return path.join(home, INDEX_QUEUE_RELATIVE_DIR);
}

export async function ensureIndexQueueDir(home) {
  const queueDir = indexQueueDir(home);
  await fs.mkdir(queueDir, { recursive: true });
  return queueDir;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeTimestamp(value) {
  return String(value || '')
    .replace(/[:.]/g, '-')
    .replace(/[^\w-]/g, '_');
}

export function normalizeIndexDelta(input, defaults = {}) {
  if (!isObject(input)) {
    throw new Error('Index queue payload must be an object');
  }

  const itemId = input.itemId || input.id;
  if (!itemId || !/^[a-z0-9][a-z0-9-]*$/.test(itemId)) {
    throw new Error('Index queue payload must include a slug-like itemId');
  }

  const createdAt = input.createdAt || defaults.createdAt || new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new Error(`Invalid createdAt timestamp for ${itemId}`);
  }

  const operation = input.operation || defaults.operation || 'upsert';
  if (!['upsert', 'delete', 'remove'].includes(operation)) {
    throw new Error(`Unsupported queue operation "${operation}" for ${itemId}`);
  }

  const source = isObject(input.source)
    ? input.source
    : (isObject(defaults.source) ? defaults.source : {});

  const patch = operation === 'upsert'
    ? (input.patch ?? input.item ?? defaults.patch ?? {})
    : {};

  if (operation === 'upsert' && !isObject(patch)) {
    throw new Error(`Queue payload for ${itemId} must include a patch object`);
  }

  return {
    schemaVersion: 1,
    type: 'index-delta',
    createdAt,
    itemId,
    operation,
    patch,
    source,
  };
}

export function normalizeIndexDeltaList(input) {
  if (Array.isArray(input)) {
    return input.map((delta) => normalizeIndexDelta(delta));
  }

  if (isObject(input) && Array.isArray(input.deltas)) {
    const defaults = {
      createdAt: input.createdAt,
      operation: input.operation,
      source: input.source,
    };
    return input.deltas.map((delta) => normalizeIndexDelta(delta, defaults));
  }

  return [normalizeIndexDelta(input)];
}

function queueFileName(delta) {
  const stamp = sanitizeTimestamp(delta.createdAt);
  const random = crypto.randomUUID().split('-')[0];
  return `${stamp}_${delta.itemId}_${random}.json`;
}

export async function writeIndexQueueRecords(home, input) {
  const queueDir = await ensureIndexQueueDir(home);
  const deltas = normalizeIndexDeltaList(input);
  const files = [];

  for (const delta of deltas) {
    const fileName = queueFileName(delta);
    const tempPath = path.join(queueDir, `${fileName}.tmp`);
    const finalPath = path.join(queueDir, fileName);
    await fs.writeFile(tempPath, `${JSON.stringify(delta, null, 2)}\n`, 'utf8');
    await fs.rename(tempPath, finalPath);
    files.push(finalPath);
  }

  return { queueDir, deltas, files };
}

export async function readIndexQueueRecords(home) {
  const queueDir = indexQueueDir(home);
  if (!await exists(queueDir)) {
    return [];
  }

  const fileNames = (await fs.readdir(queueDir))
    .filter((name) => name.endsWith('.json'))
    .sort();

  const records = [];
  for (const fileName of fileNames) {
    const filePath = path.join(queueDir, fileName);
    const raw = JSON.parse(await fs.readFile(filePath, 'utf8'));
    records.push({
      fileName,
      filePath,
      delta: normalizeIndexDelta(raw),
    });
  }

  return records;
}

export async function acquireIndexDrainLock(home) {
  const queueDir = await ensureIndexQueueDir(home);
  const lockPath = path.join(queueDir, '.drain.lock');

  let handle;
  try {
    handle = await fs.open(lockPath, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Index queue is already being drained for ${home}`);
    }
    throw error;
  }

  await handle.writeFile(`${process.pid}\n`, 'utf8');

  return {
    async release() {
      await handle.close();
      await fs.unlink(lockPath).catch(() => {});
    },
  };
}

export async function drainIndexQueue(home, options = {}) {
  const keep = options.keep ?? false;
  const lock = await acquireIndexDrainLock(home);

  try {
    const records = await readIndexQueueRecords(home);
    if (!records.length) {
      return {
        recordCount: 0,
        upserted: [],
        removed: [],
        itemCount: (await loadCanonicalIndex(home, { allowMissing: true })).items.length,
        queueEmpty: true,
      };
    }

    let workingIndex = await loadCanonicalIndex(home, { allowMissing: true });
    const touched = new Set();
    const removed = new Set();

    for (const record of records) {
      workingIndex = applyIndexDelta(workingIndex, record.delta);
      if (record.delta.operation === 'delete' || record.delta.operation === 'remove') {
        removed.add(record.delta.itemId);
      } else {
        touched.add(record.delta.itemId);
      }
    }

    const normalized = normalizeIndex(workingIndex);
    await writeCanonicalIndex(home, normalized);
    await writeDashboardFiles(home, normalized);

    if (!keep) {
      await Promise.all(records.map((record) => fs.unlink(record.filePath)));
    }

    return {
      recordCount: records.length,
      upserted: [...touched].sort(),
      removed: [...removed].sort(),
      itemCount: normalized.items.length,
      queueEmpty: !keep,
    };
  } finally {
    await lock.release();
  }
}
