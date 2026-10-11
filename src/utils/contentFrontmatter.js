import fs from 'node:fs';
import path from 'node:path';

function unquote(value) {
  return String(value ?? '').trim().replace(/^['"]|['"]$/g, '');
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function grabScalar(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.*)\\s*$`, 'm'));
  if (!match) return undefined;
  const raw = match[1].trim();
  if (!raw || raw === '|' || raw === '>' || raw.startsWith('[')) return undefined;
  return unquote(raw);
}

function grabList(block, key) {
  const inline = block.match(new RegExp(`^${key}:\\s*\\[(.*)\\]\\s*$`, 'm'));
  if (inline) {
    const body = inline[1].trim();
    if (!body) return [];
    return body.split(',').map((part) => unquote(part)).filter(Boolean);
  }
  const lines = block.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return [];
  const items = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!item) break;
    items.push(unquote(item[1]));
  }
  return items.filter(Boolean);
}

function grabItineraryShip(block) {
  const start = block.search(/^itineraryChange:\s*$/m);
  if (start < 0) return undefined;
  for (const line of block.slice(start).split('\n').slice(1)) {
    if (!/^\s/.test(line)) break;
    const ship = line.match(/^\s+ship:\s*(.+)\s*$/);
    if (ship) return unquote(ship[1]);
  }
  return undefined;
}

/** Lightweight frontmatter for tests. Pages use the Astro content collection. */
export function loadMarkdownEntries(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const block = frontmatter(fs.readFileSync(path.join(directory, file), 'utf8'));
      const ship = grabItineraryShip(block);
      return {
        id: file.slice(0, -3),
        data: {
          title: grabScalar(block, 'title') || file.slice(0, -3),
          line: grabScalar(block, 'line') || '',
          ships: grabList(block, 'ships'),
          topics: grabList(block, 'topics'),
          publishDate: grabScalar(block, 'publishDate'),
          ...(ship ? { itineraryChange: { ship } } : {}),
        },
      };
    });
}
