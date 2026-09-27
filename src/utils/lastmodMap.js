import fs from 'node:fs';
import path from 'node:path';
import { normalizeContentDate } from './etDate.js';
import { newsHubSlug } from './newsLines.js';

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function grab(block, key) {
  const m = block.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
  if (!m) return undefined;
  return m[1].replace(/^['"]|['"]$/g, '');
}

/**
 * Pathname → Date for sitemap lastmod.
 * Uses updatedAt ?? updatedDate ?? publishedAt ?? publishDate.
 * Date-only values are noon America/New_York (see etDate.js).
 */
export function buildLastmodMap(root = process.cwd()) {
  const map = new Map();
  const bump = (pathname, date) => {
    if (!date) return;
    const prev = map.get(pathname);
    if (!prev || date > prev) map.set(pathname, date);
  };

  const collections = [
    ['news', '/news/'],
    ['guides', '/guides/'],
    ['reviews', '/reviews/'],
  ];
  let newest = null;
  for (const [folder, prefix] of collections) {
    const dir = path.join(root, 'src/content', folder);
    if (!fs.existsSync(dir)) continue;
    let sectionNewest = null;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const block = frontmatter(path.join(dir, file));
      const published = normalizeContentDate(grab(block, 'publishedAt') || grab(block, 'publishDate'));
      const updated = normalizeContentDate(grab(block, 'updatedAt') || grab(block, 'updatedDate')) ?? published;
      if (!updated) continue;
      const slug = file.slice(0, -3);
      bump(`${prefix}${slug}/`, updated);
      if (folder === 'news') {
        const hub = newsHubSlug(grab(block, 'line'));
        if (hub) bump(`/news/${hub}/`, updated);
        if (/(^|\n)itineraryChange:/.test(block)) {
          bump('/trackers/itinerary-changes/', updated);
          bump('/trackers/', updated);
        }
      }
      if (!sectionNewest || updated > sectionNewest) sectionNewest = updated;
      if (!newest || updated > newest) newest = updated;
    }
    if (sectionNewest) bump(prefix, sectionNewest);
  }
  if (newest) bump('/', newest);

  const cdcFile = path.join(root, 'src/data/cdc-scores-source.json');
  if (fs.existsSync(cdcFile)) {
    const source = JSON.parse(fs.readFileSync(cdcFile, 'utf8'));
    const retrieved = normalizeContentDate(source.retrieved);
    bump('/trackers/cdc-scores/', retrieved);
    bump('/trackers/', retrieved);
  }

  const shipsFile = path.join(root, 'src/data/ships.json');
  if (fs.existsSync(shipsFile)) {
    const ships = JSON.parse(fs.readFileSync(shipsFile, 'utf8'));
    let shipsNewest = null;
    for (const ship of ships) {
      const updated = normalizeContentDate(ship.updated);
      if (!updated) continue;
      bump(`/ships/${ship.line}/${ship.id}/`, updated);
      if (!shipsNewest || updated > shipsNewest) shipsNewest = updated;
    }
    if (shipsNewest) bump('/ships/', shipsNewest);
  }

  return map;
}
