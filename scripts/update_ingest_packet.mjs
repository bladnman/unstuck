#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { updateIngestPacket } from './lib/ingest_orchestrator.mjs';

function usage() {
  console.error('Usage: node scripts/update_ingest_packet.mjs /absolute/path/to/unstuck packet.json [update.json]');
  console.error('If update.json is omitted, JSON is read from stdin.');
  process.exit(1);
}

async function readPayload(payloadPath) {
  if (payloadPath) {
    return JSON.parse(await fs.readFile(payloadPath, 'utf8'));
  }

  let raw = '';
  for await (const chunk of process.stdin) {
    raw += chunk;
  }

  if (!raw.trim()) {
    throw new Error('No JSON update payload provided on stdin');
  }

  return JSON.parse(raw);
}

async function main() {
  const args = process.argv.slice(2);
  const home = args[0];
  const packetPath = args[1];
  if (!home || !packetPath) {
    usage();
  }

  const payloadPath = args[2];
  const update = await readPayload(payloadPath);
  const result = await updateIngestPacket(path.resolve(home), packetPath, update);

  console.log(`Updated packet ${result.packet.packetId}`);
  console.log(`- run: ${result.packet.runId}`);
  console.log(`- status: ${result.packet.status}`);
  console.log(`- manifest status: ${result.manifest.status}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
