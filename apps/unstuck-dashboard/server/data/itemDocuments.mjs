import fs from 'node:fs/promises';
import path from 'node:path';

import { buildSearchText, excerptText, parseIsoDate } from '../../../../scripts/lib/unstuck_index.mjs';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    return {
      data: null,
      body: markdown,
    };
  }

  const data = {};
  for (const line of match[1].split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key) {
      continue;
    }

    data[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return {
    data,
    body: markdown.slice(match[0].length),
  };
}

function stringifyFrontmatter(data) {
  const lines = Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`);

  if (!lines.length) {
    return '';
  }

  return `---\n${lines.join('\n')}\n---\n\n`;
}

function syncFrontmatterFromIndex(markdown, item) {
  const frontmatter = parseFrontmatter(markdown);
  if (!frontmatter.data) {
    return markdown;
  }

  const nextFrontmatter = {
    ...frontmatter.data,
    title: item.title,
    summary: item.summary,
    status: item.status,
    state: item.state,
    plannedStart: item.plannedStart,
    fixedStartTime: item.fixedStartTime,
    durationMinutes: item.durationMinutes,
    durationDays: item.durationDays,
    dueDate: item.dueDate,
    scheduleMode: item.scheduleMode,
    rank: item.rank,
  };

  return `${stringifyFrontmatter(nextFrontmatter)}${frontmatter.body.trimStart()}`;
}

function parseSections(markdown) {
  const matches = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)];
  if (!matches.length) {
    return {
      preamble: markdown.trimEnd(),
      sections: [],
    };
  }

  const sections = matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const start = match.index ?? 0;
    const bodyStart = start + match[0].length;
    const bodyEnd = nextMatch?.index ?? markdown.length;

    return {
      heading: match[1].trim(),
      start,
      body: markdown.slice(bodyStart, bodyEnd).trim(),
    };
  });

  return {
    preamble: markdown.slice(0, matches[0].index).trimEnd(),
    sections,
  };
}

function stringifySections(preamble, sections) {
  const sectionBlocks = sections.map((section) =>
    `## ${section.heading}\n\n${section.body.trim()}`.trimEnd(),
  );

  return [preamble.trimEnd(), ...sectionBlocks].filter(Boolean).join('\n\n').trimEnd();
}

function replaceSection(markdown, heading, nextContent) {
  const parsed = parseSections(markdown);
  const nextSections = [];
  let inserted = false;

  for (const section of parsed.sections) {
    if (section.heading === heading) {
      if (!inserted) {
        nextSections.push({
          heading,
          body: nextContent.trim(),
        });
        inserted = true;
      }
      continue;
    }

    nextSections.push(section);
  }

  if (!inserted) {
    nextSections.push({
      heading,
      body: nextContent.trim(),
    });
  }

  return stringifySections(parsed.preamble, nextSections);
}

function replaceHeading(markdown, title) {
  if (/^#\s+/m.test(markdown)) {
    return markdown.replace(/^#\s+.*$/m, `# ${title}`);
  }

  return `# ${title}\n\n${markdown.trim()}\n`;
}

function replaceSummaryBlock(markdown, summary) {
  const cleanSummary = `> ${summary}`.trim();

  if (/^>\s+/m.test(markdown)) {
    return markdown.replace(/^>\s+.*$/m, cleanSummary);
  }

  const headingMatch = markdown.match(/^#\s+.*$/m);
  if (!headingMatch) {
    return `${cleanSummary}\n\n${markdown.trim()}\n`;
  }

  return markdown.replace(headingMatch[0], `${headingMatch[0]}\n\n${cleanSummary}`);
}

export function extractIndexFieldsFromItemMarkdown(markdown) {
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
  const summary = markdown.match(/^>\s+(.+)$/m)?.[1]?.trim() || '';
  const statusSection = markdown.match(/^##\s+Status\s*$([\s\S]*?)(?=^##\s+|$)/m)?.[1] || '';
  const understandingSection = markdown.match(/^##\s+Understanding\s*$([\s\S]*?)(?=^##\s+|$)/m)?.[1] || '';
  const status = excerptText(statusSection, 180);

  return {
    title,
    summary,
    status,
    searchText: buildSearchText([title, summary, statusSection, understandingSection]),
  };
}

export function buildPlanningMarkdown(item) {
  const parts = [];

  if (parseIsoDate(item.plannedStart)) {
    parts.push(`- Planned start: ${item.plannedStart}`);
  }
  if (item.fixedStartTime) {
    parts.push(`- Fixed start time: ${item.fixedStartTime}`);
  }
  if (item.durationMinutes) {
    parts.push(`- Time-block duration: ${item.durationMinutes} minutes`);
  }
  if (item.durationDays) {
    parts.push(`- Working duration: ${item.durationDays} day${item.durationDays === 1 ? '' : 's'}`);
  }
  if (parseIsoDate(item.dueDate)) {
    parts.push(`- Due date: ${item.dueDate}`);
  }
  if (item.scheduleMode) {
    parts.push(`- Schedule mode: ${item.scheduleMode}`);
  }

  return parts.join('\n');
}

export async function syncItemDocumentFromIndex(item, home) {
  const itemDirectory = path.join(home, item.path || `items/${item.id}`);
  const itemPath = path.join(itemDirectory, 'ITEM.md');

  if (!await pathExists(itemPath)) {
    return;
  }

  let markdown = await fs.readFile(itemPath, 'utf8');
  markdown = syncFrontmatterFromIndex(markdown, item);
  markdown = replaceHeading(markdown, item.title);

  if (item.summary) {
    markdown = replaceSummaryBlock(markdown, item.summary);
  }
  if (item.status) {
    markdown = replaceSection(markdown, 'Status', item.status);
  }

  const planningMarkdown = buildPlanningMarkdown(item);
  if (planningMarkdown) {
    markdown = replaceSection(markdown, 'Planning', planningMarkdown);
  }

  await fs.writeFile(itemPath, markdown.trimEnd() + '\n', 'utf8');
}

export async function readItemDetail(item, home) {
  const itemDirectory = path.join(home, item.path || `items/${item.id}`);
  const itemPath = path.join(itemDirectory, 'ITEM.md');
  const contextDirectory = path.join(itemDirectory, 'context');
  const document = await pathExists(itemPath) ? await fs.readFile(itemPath, 'utf8') : '';
  const contextFiles = [];

  if (await pathExists(contextDirectory)) {
    const entries = await fs.readdir(contextDirectory, { withFileTypes: true });
    const markdownEntries = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of markdownEntries) {
      const contextPath = path.join(contextDirectory, entry.name);
      contextFiles.push({
        name: entry.name,
        content: await fs.readFile(contextPath, 'utf8'),
        path: path.relative(home, contextPath),
      });
    }
  }

  return {
    ...item,
    document,
    contextFiles,
  };
}

export async function writeItemDocument(item, home, markdown) {
  const itemDirectory = path.join(home, item.path || `items/${item.id}`);
  await fs.mkdir(itemDirectory, { recursive: true });
  await fs.writeFile(path.join(itemDirectory, 'ITEM.md'), markdown.trimEnd() + '\n', 'utf8');
}
