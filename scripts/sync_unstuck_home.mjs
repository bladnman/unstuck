#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildSearchText,
  exists,
  normalizeIndex,
  parseIsoDate,
  plainText,
  titleFromSlug,
  uniq,
  writeCanonicalIndex,
  writeDashboardFiles,
} from './lib/unstuck_index.mjs';

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function usage() {
  console.error('Usage: node scripts/sync_unstuck_home.mjs [--from-legacy] /absolute/path/to/unstuck');
  process.exit(1);
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseMonthDay(text, year) {
  const match = text.match(/\b(?:due|by|deadline|for)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\b/i);
  if (!match) {
    return null;
  }
  const month = MONTHS[match[1].toLowerCase()];
  return isoDate(year, month, Number(match[2]));
}

function parseWeekOfMonth(text, year) {
  const explicit = text.match(/\b(\d)(?:st|nd|rd|th)?\s+week\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  if (explicit) {
    const month = MONTHS[explicit[2].toLowerCase()];
    const week = Number(explicit[1]);
    return isoDate(year, month, week * 7);
  }

  const secondWeek = text.match(/\b(?:2nd|second)\s+week\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
  if (secondWeek) {
    const month = MONTHS[secondWeek[1].toLowerCase()];
    return isoDate(year, month, 14);
  }

  return null;
}

function parseLegacyIndex(markdown) {
  const lines = markdown.split(/\r?\n/);
  const items = [];
  let lastUpdated = null;
  let state = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const updatedMatch = line.match(/^Last updated:\s*(\d{4}-\d{2}-\d{2})$/i);
    if (updatedMatch) {
      lastUpdated = updatedMatch[1];
      continue;
    }

    const sectionMatch = line.match(/^##\s+(Active|Simmering|Parked|Archived|Resolved)$/);
    if (sectionMatch) {
      state = sectionMatch[1].toLowerCase();
      continue;
    }

    if (!state || !line.startsWith('|')) {
      continue;
    }

    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 4) {
      continue;
    }

    const allSeparators = cells.every((cell) => /^:?-{2,}:?$/.test(cell.replace(/\s+/g, '')));
    if (cells[0] === 'Item' || allSeparators) {
      continue;
    }

    const linkMatch = cells[0].match(/\[([^\]]+)]\(([^)]+)\)/);
    if (!linkMatch) {
      continue;
    }

    items.push({
      id: linkMatch[1],
      path: linkMatch[2],
      summary: cells[1],
      lastTouched: cells[2],
      status: cells[3],
      state,
    });
  }

  return { lastUpdated, items };
}

function extractSection(markdown, heading) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start === -1) {
    return '';
  }

  const afterHeading = markdown.slice(start + marker.length).replace(/^\s*\n/, '');
  const nextHeadingOffset = afterHeading.search(/^##\s+/m);
  const section = nextHeadingOffset === -1
    ? afterHeading
    : afterHeading.slice(0, nextHeadingOffset);

  return section.trim();
}

async function readItemFile(home, legacyItem, defaultYear) {
  const itemDir = path.join(home, legacyItem.path);
  const itemPath = path.join(itemDir, 'ITEM.md');
  const markdown = (await exists(itemPath)) ? await fs.readFile(itemPath, 'utf8') : '';

  const title = markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? titleFromSlug(legacyItem.id);
  const teaser = markdown.match(/^>\s+(.+)$/m)?.[1].trim() ?? legacyItem.summary;
  const statusDetail = plainText(extractSection(markdown, 'Status'));
  const understanding = plainText(extractSection(markdown, 'Understanding'));
  const connections = uniq(
    [...markdown.matchAll(/\[[^\]]+]\(\.\.\/([^/]+)\/\)/g)].map((match) => match[1]),
  );

  let createdAt = legacyItem.lastTouched;
  const dates = [...markdown.matchAll(/-\s+(\d{4}-\d{2}-\d{2}):/g)].map((match) => match[1]);
  if (dates.length) {
    createdAt = dates.sort()[0];
  }

  const metadataText = buildSearchText([
    legacyItem.id,
    title,
    legacyItem.summary,
    legacyItem.status,
    teaser,
    statusDetail,
  ]);

  const lowerMetadataText = metadataText.toLowerCase();
  const fullSearchText = buildSearchText([
    metadataText,
    understanding,
    markdown,
  ]);

  const item = {
    id: legacyItem.id,
    title,
    summary: legacyItem.summary || teaser,
    state: legacyItem.state,
    status: legacyItem.status,
    lastTouched: legacyItem.lastTouched,
    createdAt,
    kind: inferKind(legacyItem.id, title, lowerMetadataText),
    domains: inferDomains(legacyItem.id, lowerMetadataText),
    tags: inferTags(legacyItem.id, lowerMetadataText),
    scope: inferScope(legacyItem.id, lowerMetadataText),
    path: legacyItem.path,
    teaser,
    statusDetail,
    connections,
    searchText: fullSearchText,
  };

  const dueDate = inferDueDate([legacyItem.status, legacyItem.summary, teaser, statusDetail], defaultYear);
  if (dueDate) {
    item.dueDate = dueDate;
  }

  return item;
}

function inferKind(id, title, lowerText) {
  const subject = `${id} ${title}`.toLowerCase();
  if (subject.startsWith('video-') || title.toLowerCase().startsWith('video:')) {
    return 'video';
  }
  if (subject.includes('server')) {
    return 'infrastructure';
  }
  if (subject.includes('system')) {
    return 'system';
  }
  if (subject.includes('backlog')) {
    return 'backlog';
  }
  if (subject.includes('slides') || subject.includes('curriculum') || lowerText.includes('lecture')) {
    return 'deliverable';
  }
  if (subject.includes('idea')) {
    return 'idea';
  }
  if (lowerText.includes('concern') || lowerText.includes('anxiety')) {
    return 'concern';
  }
  return 'project';
}

function inferDomains(id, lowerText) {
  const domains = [];

  if (/\b(video|youtube|wordlight|pencil|cursor|channel|shoot|scripted)\b/.test(lowerText) || id.startsWith('video-')) {
    domains.push('youtube');
  }

  if (/\b(all-hands|workshop|igniter|supercharger|translation|conference|co-lead|org|meeting)\b/.test(lowerText)) {
    domains.push('work');
  }

  if (/\b(server|agent|async|notion|infrastructure|job runner|recurring job)\b/.test(lowerText) || id.includes('server')) {
    domains.push('systems');
  }

  if (!domains.length) {
    domains.push('general');
  }

  return uniq(domains);
}

function inferTags(id, lowerText) {
  const tags = new Set();
  const rules = [
    ['all-hands', /\ball-hands\b/],
    ['slides', /\bslides?\b|\bdeck\b/],
    ['igniter', /\bigniter\b/],
    ['supercharger', /\bsupercharger\b/],
    ['curriculum', /\bcurriculum\b|\blectures?\b/],
    ['meeting-miner', /\bmeeting miner\b/],
    ['meetings', /\bmeetings?\b/],
    ['server', /\bserver\b|\bmacbook air\b/],
    ['agents', /\bagents?\b/],
    ['async', /\basync\b/],
    ['notion', /\bnotion\b/],
    ['video', /\bvideo\b/],
    ['backlog', /\bbacklog\b/],
    ['wordlight', /\bwordlight\b/],
    ['refactor', /\brefactor\w*\b/],
    ['intent-preservation', /\bintent preservation\b/],
    ['codex', /\bcodex\b/],
    ['opus', /\bopus\b/],
    ['pencil', /\bpencil\b/],
    ['design', /\bdesign\b/],
    ['home-server', /\bhome server\b/],
    ['workshop', /\bworkshop\b/],
  ];

  for (const [tag, pattern] of rules) {
    if (pattern.test(lowerText)) {
      tags.add(tag);
    }
  }

  for (const part of id.split('-')) {
    if (part.length > 3 && !['video', 'idea'].includes(part)) {
      tags.add(part);
    }
  }

  return [...tags].sort();
}

function inferScope(id, lowerText) {
  if (/\bmassive\b|\benormous\b|\b2-day\b|\bmultiple\b|\bgrowing pile\b|\bwide open\b|\bfull story arc\b/.test(lowerText)) {
    return 'large';
  }
  if (/\bdeck\b|\bslides\b|\bserver\b|\bvideo\b|\blecture\b|\bdesign\b/.test(lowerText) || id.includes('server')) {
    return 'medium';
  }
  return 'small';
}

function inferDueDate(textParts, year) {
  const combined = textParts.filter(Boolean).join(' ');
  return parseMonthDay(combined, year) || parseWeekOfMonth(combined, year) || null;
}

async function buildIndex(home, options = {}) {
  const canonicalPath = path.join(home, 'index.json');
  if (!options.fromLegacy && await exists(canonicalPath)) {
    const raw = JSON.parse(await fs.readFile(canonicalPath, 'utf8'));
    return normalizeIndex(raw);
  }

  const legacyCandidates = ['INDEX.md', 'INDEX.legacy.md'];
  const legacyPath = (await Promise.all(
    legacyCandidates.map(async (candidate) => ((await exists(path.join(home, candidate))) ? path.join(home, candidate) : null)),
  )).find(Boolean);

  if (!legacyPath) {
    throw new Error(`No index source found in ${home}`);
  }

  const legacy = parseLegacyIndex(await fs.readFile(legacyPath, 'utf8'));
  const year = Number((legacy.lastUpdated || new Date().toISOString().slice(0, 10)).slice(0, 4));
  const items = [];
  for (const legacyItem of legacy.items) {
    items.push(await readItemFile(home, legacyItem, year));
  }

  return normalizeIndex({
    lastUpdated: legacy.lastUpdated || new Date().toISOString().slice(0, 10),
    items,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const fromLegacy = args.includes('--from-legacy');
  const filteredArgs = args.filter((arg) => arg !== '--from-legacy');
  const targetHome = filteredArgs[0];
  if (!targetHome) {
    usage();
  }

  const home = path.resolve(targetHome);
  const index = await buildIndex(home, { fromLegacy });

  const normalized = await writeCanonicalIndex(home, index);
  await writeDashboardFiles(home, normalized);

  console.log(`Synced ${home}`);
  console.log(`- index.json (${normalized.items.length} items)`);
  console.log('- dashboard.html');
  console.log('- dashboard-data.js');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
