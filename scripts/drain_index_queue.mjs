#!/usr/bin/env node

import path from 'node:path';

import { drainIndexQueue } from './lib/index_queue.mjs';

function usage() {
  console.error('Usage: node scripts/drain_index_queue.mjs [--keep] /absolute/path/to/unstuck');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const keep = args.includes('--keep');
  const filteredArgs = args.filter((arg) => arg !== '--keep');
  const homeArg = filteredArgs[0];
  if (!homeArg) {
    usage();
  }

  const home = path.resolve(homeArg);
  const result = await drainIndexQueue(home, { keep });
  if (!result.recordCount) {
    console.log(`Index queue is already empty for ${home}`);
    return;
  }

  console.log(`Drained ${result.recordCount} queue record(s) for ${home}`);
  if (result.upserted.length) {
    console.log(`- upserted: ${result.upserted.join(', ')}`);
  }
  if (result.removed.length) {
    console.log(`- removed: ${result.removed.join(', ')}`);
  }
  console.log(`- index.json (${result.itemCount} items)`);
  console.log('- dashboard.html');
  console.log('- dashboard-data.js');
  if (keep) {
    console.log('- queue records kept in place (--keep)');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
