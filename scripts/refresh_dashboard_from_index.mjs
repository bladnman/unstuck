#!/usr/bin/env node

import { loadCanonicalIndex, writeDashboardFiles } from './lib/unstuck_index.mjs';

function usage() {
  console.error('Usage: node scripts/refresh_dashboard_from_index.mjs /absolute/path/to/unstuck');
}

async function main() {
  const home = process.argv[2];

  if (!home) {
    usage();
    process.exit(1);
  }

  const index = await loadCanonicalIndex(home);
  const normalized = await writeDashboardFiles(home, index);

  console.log(`Refreshed dashboard files in ${home}`);
  console.log(`- dashboard.html`);
  console.log(`- dashboard-data.js (${normalized.items.length} items)`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
