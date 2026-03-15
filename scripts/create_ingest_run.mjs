#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { createIngestRun } from './lib/ingest_orchestrator.mjs';

function usage() {
  console.error('Usage: node scripts/create_ingest_run.mjs /absolute/path/to/unstuck [payload.json]');
  console.error('If payload.json is omitted, JSON is read from stdin.');
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
    throw new Error('No JSON payload provided on stdin');
  }

  return JSON.parse(raw);
}

async function main() {
  const args = process.argv.slice(2);
  const home = args[0];
  if (!home) {
    usage();
  }

  const payloadPath = args[1];
  const payload = await readPayload(payloadPath);
  const result = await createIngestRun(path.resolve(home), payload);

  console.log(`Created ingest run ${result.manifest.runId}`);
  console.log(`- manifest: ${result.manifestPath}`);
  console.log(`- packets: ${result.packets.length}`);
  for (const packet of result.packets) {
    console.log(`- ${packet.packetId}: ${packet.packetPath}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
