#!/usr/bin/env node

import path from 'node:path';

import { finalizeIngestRun } from './lib/ingest_orchestrator.mjs';

function usage() {
  console.error('Usage: node scripts/finalize_ingest_run.mjs [--keep-index-queue] /absolute/path/to/unstuck run-id');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const keepIndexQueue = args.includes('--keep-index-queue');
  const filteredArgs = args.filter((arg) => arg !== '--keep-index-queue');
  const home = filteredArgs[0];
  const runId = filteredArgs[1];
  if (!home || !runId) {
    usage();
  }

  const result = await finalizeIngestRun(path.resolve(home), runId, { keepIndexQueue });
  console.log(`Finalized ingest run ${result.manifest.runId}`);
  console.log(`- status: ${result.manifest.status}`);
  console.log(`- packets: ${result.manifest.packetCount}`);
  console.log(`- index queue records drained: ${result.drain.recordCount}`);
  console.log(`- index.json (${result.drain.itemCount} items)`);
  console.log('- dashboard.html');
  console.log('- dashboard-data.js');
  if (keepIndexQueue) {
    console.log('- index queue records kept in place (--keep-index-queue)');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
