import fs from 'node:fs/promises';
import path from 'node:path';

import { drainIndexQueue } from './index_queue.mjs';
import { titleFromSlug, uniq } from './unstuck_index.mjs';

export const INGEST_QUEUE_RELATIVE_DIR = path.join('.work-queue', 'ingest');

const PACKET_STATUSES = new Set(['pending', 'in_progress', 'blocked', 'done', 'skipped']);
const PACKET_ACTIONS = new Set(['create', 'update', 'merge', 'review', 'archive', 'resolve']);

function nowIso() {
  return new Date().toISOString();
}

function dateStamp() {
  return nowIso().replace(/[:.]/g, '-');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStringArray(values) {
  return uniq((values || []).map((value) => String(value).trim()).filter(Boolean));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function ensureRunId(value) {
  const normalized = String(value || '').replace(/[^\w.-]/g, '-').replace(/-{2,}/g, '-');
  const cleaned = normalized.replace(/^-+|-+$/g, '');
  if (!cleaned) {
    throw new Error('Ingest run id is empty after normalization');
  }
  return cleaned;
}

function normalizePacketStatus(value) {
  const status = String(value || 'pending').toLowerCase();
  if (!PACKET_STATUSES.has(status)) {
    throw new Error(`Unsupported packet status "${value}"`);
  }
  return status;
}

function normalizePacketAction(value) {
  const action = String(value || 'update').toLowerCase();
  if (!PACKET_ACTIONS.has(action)) {
    throw new Error(`Unsupported packet action "${value}"`);
  }
  return action;
}

function deriveRunStatus(packets, finalizedAt) {
  if (finalizedAt) {
    return 'completed';
  }

  const statuses = packets.map((packet) => packet.status);
  if (statuses.length && statuses.every((status) => status === 'done' || status === 'skipped')) {
    return 'ready_to_finalize';
  }
  if (statuses.some((status) => status === 'in_progress' || status === 'blocked' || status === 'done')) {
    return 'in_progress';
  }
  return 'pending';
}

function packetCounts(packets) {
  const counts = {};
  for (const packet of packets) {
    counts[packet.status] = (counts[packet.status] || 0) + 1;
  }
  return counts;
}

export function ingestQueueDir(home) {
  return path.join(home, INGEST_QUEUE_RELATIVE_DIR);
}

export function ingestRunsDir(home) {
  return path.join(ingestQueueDir(home), 'runs');
}

export function ingestRunDir(home, runId) {
  return path.join(ingestRunsDir(home), runId);
}

export function ingestPacketsDir(home, runId) {
  return path.join(ingestRunDir(home, runId), 'packets');
}

export function ingestManifestPath(home, runId) {
  return path.join(ingestRunDir(home, runId), 'manifest.json');
}

export async function ensureIngestQueueDirs(home) {
  await fs.mkdir(ingestRunsDir(home), { recursive: true });
}

function relativeToHome(home, targetPath) {
  return path.relative(home, targetPath);
}

function resolveHomePath(home, targetPath) {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }
  return path.join(home, targetPath);
}

function normalizeSession(input) {
  const session = isObject(input) ? input : {};
  return {
    id: session.id ? String(session.id) : undefined,
    path: session.path ? String(session.path) : undefined,
    rawInputs: normalizeStringArray(session.rawInputs),
  };
}

function normalizePacket(input, runId, index, home) {
  if (!isObject(input)) {
    throw new Error('Each ingest item must be an object');
  }

  const itemId = input.itemId || input.id;
  if (!itemId || !/^[a-z0-9][a-z0-9-]*$/.test(itemId)) {
    throw new Error('Each ingest item must include a slug-like itemId');
  }

  const packetId = ensureRunId(input.packetId || `${String(index + 1).padStart(2, '0')}-${itemId}`);
  const status = normalizePacketStatus(input.status);
  const packet = {
    schemaVersion: 1,
    type: 'ingest-work-packet',
    runId,
    packetId,
    createdAt: input.createdAt || nowIso(),
    updatedAt: input.updatedAt || input.createdAt || nowIso(),
    status,
    itemId,
    title: input.title ? String(input.title) : titleFromSlug(itemId),
    action: normalizePacketAction(input.action),
    itemPath: input.itemPath ? String(input.itemPath) : `items/${itemId}/`,
    workerBrief: input.workerBrief ? String(input.workerBrief) : '',
    rawInputs: normalizeStringArray(input.rawInputs),
    contextFiles: normalizeStringArray(input.contextFiles),
    expectedOutputs: normalizeStringArray(input.expectedOutputs),
    sourceRefs: normalizeStringArray(input.sourceRefs),
    notes: normalizeStringArray(input.notes),
    indexPatchHints: isObject(input.indexPatchHints) ? input.indexPatchHints : undefined,
    metadata: isObject(input.metadata) ? input.metadata : {},
    completion: isObject(input.completion) ? input.completion : {},
  };

  if ((status === 'done' || status === 'skipped') && !packet.completion.completedAt) {
    packet.completion.completedAt = nowIso();
  }

  const packetPath = path.join(ingestPacketsDir(home, runId), `${packetId}.json`);
  packet.packetPath = relativeToHome(home, packetPath);
  packet.manifestPath = relativeToHome(home, ingestManifestPath(home, runId));

  return packet;
}

function packetDescriptor(packet) {
  return {
    packetId: packet.packetId,
    itemId: packet.itemId,
    title: packet.title,
    action: packet.action,
    status: packet.status,
    packetPath: packet.packetPath,
    workerBrief: packet.workerBrief,
  };
}

function normalizeRunPayload(input) {
  if (!isObject(input)) {
    throw new Error('Ingest run payload must be an object');
  }

  if (!Array.isArray(input.items) || !input.items.length) {
    throw new Error('Ingest run payload must include a non-empty items array');
  }

  const baseLabel = input.runId || input.label || input.session?.id || input.summary || 'ingest';
  const slug = slugify(baseLabel) || 'ingest';
  return {
    runId: ensureRunId(input.runId || `${dateStamp()}_${slug}`),
    createdAt: input.createdAt || nowIso(),
    summary: input.summary ? String(input.summary) : '',
    session: normalizeSession(input.session),
    source: isObject(input.source) ? input.source : {},
    items: input.items,
  };
}

async function writeJson(targetPath, value) {
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function createIngestRun(home, input) {
  await ensureIngestQueueDirs(home);
  const normalized = normalizeRunPayload(input);
  const runDir = ingestRunDir(home, normalized.runId);
  const packetsDir = ingestPacketsDir(home, normalized.runId);

  await fs.mkdir(runDir, { recursive: false });
  await fs.mkdir(packetsDir, { recursive: true });

  const packets = normalized.items.map((item, index) => normalizePacket(item, normalized.runId, index, home));
  for (const packet of packets) {
    await writeJson(resolveHomePath(home, packet.packetPath), packet);
  }

  const manifest = {
    schemaVersion: 1,
    type: 'ingest-run',
    runId: normalized.runId,
    createdAt: normalized.createdAt,
    updatedAt: normalized.createdAt,
    finalizedAt: null,
    status: deriveRunStatus(packets, null),
    summary: normalized.summary,
    session: normalized.session,
    source: normalized.source,
    packetCount: packets.length,
    packetCounts: packetCounts(packets),
    packets: packets.map(packetDescriptor),
  };

  await writeJson(ingestManifestPath(home, normalized.runId), manifest);

  return {
    manifest,
    manifestPath: ingestManifestPath(home, normalized.runId),
    packets,
  };
}

export async function readIngestManifest(home, runId) {
  const manifest = JSON.parse(await fs.readFile(ingestManifestPath(home, runId), 'utf8'));
  return manifest;
}

export async function readIngestPacket(home, packetPath) {
  return JSON.parse(await fs.readFile(resolveHomePath(home, packetPath), 'utf8'));
}

export async function refreshIngestManifest(home, runId) {
  const manifest = await readIngestManifest(home, runId);
  const packets = [];
  for (const descriptor of manifest.packets) {
    packets.push(await readIngestPacket(home, descriptor.packetPath));
  }

  const nextManifest = {
    ...manifest,
    updatedAt: nowIso(),
    status: deriveRunStatus(packets, manifest.finalizedAt),
    packetCount: packets.length,
    packetCounts: packetCounts(packets),
    packets: packets.map(packetDescriptor),
  };

  await writeJson(ingestManifestPath(home, runId), nextManifest);
  return { manifest: nextManifest, packets };
}

export async function updateIngestPacket(home, packetPath, update) {
  if (!isObject(update)) {
    throw new Error('Packet update payload must be an object');
  }

  const resolvedPacketPath = resolveHomePath(home, packetPath);
  const packet = JSON.parse(await fs.readFile(resolvedPacketPath, 'utf8'));
  const manifest = await readIngestManifest(home, packet.runId);
  if (manifest.finalizedAt) {
    throw new Error(`Ingest run ${packet.runId} is already finalized`);
  }

  const nextStatus = update.status ? normalizePacketStatus(update.status) : packet.status;
  const nextCompletion = {
    ...(isObject(packet.completion) ? packet.completion : {}),
    ...(isObject(update.completion) ? update.completion : {}),
  };

  if (update.worker) {
    nextCompletion.worker = String(update.worker);
  }
  if (update.summary) {
    nextCompletion.summary = String(update.summary);
  }
  if (Array.isArray(update.touchedFiles)) {
    nextCompletion.touchedFiles = normalizeStringArray(update.touchedFiles);
  }
  if (typeof update.queuedIndexUpdate === 'boolean') {
    nextCompletion.queuedIndexUpdate = update.queuedIndexUpdate;
  }

  if ((nextStatus === 'done' || nextStatus === 'skipped') && !nextCompletion.completedAt) {
    nextCompletion.completedAt = nowIso();
  }
  if (nextStatus !== 'done' && nextStatus !== 'skipped') {
    delete nextCompletion.completedAt;
  }

  const nextPacket = {
    ...packet,
    status: nextStatus,
    updatedAt: nowIso(),
    notes: update.notes ? normalizeStringArray(update.notes) : packet.notes,
    completion: nextCompletion,
  };

  await writeJson(resolvedPacketPath, nextPacket);
  const refreshed = await refreshIngestManifest(home, packet.runId);

  return {
    packet: nextPacket,
    manifest: refreshed.manifest,
  };
}

export async function finalizeIngestRun(home, runId, options = {}) {
  const refreshed = await refreshIngestManifest(home, runId);
  const unresolved = refreshed.packets.filter((packet) => !['done', 'skipped'].includes(packet.status));
  if (unresolved.length) {
    throw new Error(`Cannot finalize ${runId}; unresolved packets: ${unresolved.map((packet) => packet.packetId).join(', ')}`);
  }

  const drain = await drainIndexQueue(home, { keep: options.keepIndexQueue ?? false });
  const finalizedManifest = {
    ...refreshed.manifest,
    updatedAt: nowIso(),
    finalizedAt: nowIso(),
    status: 'completed',
    indexDrain: drain,
  };
  await writeJson(ingestManifestPath(home, runId), finalizedManifest);

  return {
    manifest: finalizedManifest,
    drain,
  };
}
