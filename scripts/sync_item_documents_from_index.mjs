#!/usr/bin/env node

import path from 'node:path';

import { loadCanonicalIndex } from './lib/unstuck_index.mjs';
import { syncItemDocumentFromIndex } from '../apps/unstuck-dashboard/server/data/itemDocuments.mjs';

function usage() {
  console.error('Usage: node scripts/sync_item_documents_from_index.mjs /absolute/path/to/unstuck');
}

async function main() {
  const home = process.argv[2];
  if (!home) {
    usage();
    process.exit(1);
  }

  const index = await loadCanonicalIndex(home);
  let syncedCount = 0;

  for (const item of index.items) {
    await syncItemDocumentFromIndex(item, home);
    syncedCount += 1;
  }

  console.log(`Synced ${syncedCount} item documents from ${path.join(home, 'index.json')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
