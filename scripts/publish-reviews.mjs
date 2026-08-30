#!/usr/bin/env node
import { readdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const REVIEWS_DIR = 'src/content/reviews';
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '010f4e3e-5b7d-48c3-8e7c-2a88165e1e1b';
const CHANNELS = ['No Fluff Cruising', 'PHAPD'];

const api = async (endpoint, options = {}) => {
  const res = await fetch(`https://api.notion.com/v1/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Notion ${endpoint} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
};

async function publishableRows() {
  const rows = [];
  let cursor;
  do {
    const body = {
      page_size: 100,
      filter: {
        and: [
          { or: CHANNELS.map((c) => ({ property: 'Channel', select: { equals: c } })) },
          { property: 'Status', status: { equals: 'Posted' } },
          { property: 'Published video link', url: { is_not_empty: true } },
        ],
      },
    };
    if (cursor) body.start_cursor = cursor;
    const page = await api(`databases/${DATABASE_ID}/query`, { method: 'POST', body: JSON.stringify(body) });
    rows.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return rows;
}

const plain = (rt = []) => rt.map((t) => t.plain_text ?? '').join('');

async function draftFromRow(pageId) {
  let cursor;
  do {
    const q = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const res = await api(`blocks/${pageId}/children${q}`);
    for (const block of res.results) {
      if (block.type === 'code') {
        const text = plain(block.code.rich_text);
        if (text.trim().startsWith('---')) return text;
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return null;
}

const slugify = (s) =>
  s.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

const exists = async (p) => access(p).then(() => true).catch(() => false);

function validate(md) {
  const problems = [];
  if (!md.startsWith('---')) problems.push('does not start with frontmatter');
  const fm = md.split('---')[1] ?? '';
  for (const key of ['title:', 'description:', 'answer:', 'publishDate:', 'video:']) {
    if (!fm.includes(key)) problems.push(`frontmatter missing ${key}`);
  }
  if (!fm.includes('sources:')) problems.push('frontmatter missing sources');
  if (/DRAFT FOR APPROVAL|not published/i.test(md)) problems.push('still contains the internal review header');
  if (md.includes('[VIDEO EMBED')) problems.push('still contains the embed placeholder');
  const body = md.split('---').slice(2).join('---');
  if (body.trim().split(/\s+/).length < 300) problems.push('body is too short to publish');
  return problems;
}

const main = async () => {
  if (!NOTION_TOKEN) {
    console.error('NOTION_TOKEN is not set. Add it under Settings, Secrets and variables, Actions.');
    process.exit(1);
  }

  const onDisk = new Set((await readdir(REVIEWS_DIR)).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')));
  console.log(`Reviews already on the site: ${onDisk.size}`);

  const rows = await publishableRows();
  console.log(`Tracker rows with a live video: ${rows.length}`);

  let written = 0;
  for (const row of rows) {
    const title = plain(row.properties?.Video?.title) || row.id;

    const md = await draftFromRow(row.id);
    if (!md) { console.log(`SKIP  "${title}": no draft on the row yet`); continue; }

    const fmTitle = md.match(/^title:\s*"(.+?)"\s*$/m)?.[1] ?? title;
    const slug = slugify(fmTitle);
    if (onDisk.has(slug) || (await exists(path.join(REVIEWS_DIR, `${slug}.md`)))) {
      console.log(`SKIP  "${fmTitle}": already published`);
      continue;
    }

    const problems = validate(md);
    if (problems.length) { console.log(`REJECT "${fmTitle}": ${problems.join('; ')}`); continue; }

    await writeFile(path.join(REVIEWS_DIR, `${slug}.md`), md.endsWith('\n') ? md : `${md}\n`, 'utf8');
    onDisk.add(slug);
    written++;
    console.log(`WROTE ${slug}.md  ${fmTitle}`);
  }

  console.log(`\n${written} post(s) written.`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `written=${written}\n`, { flag: 'a' });
  }
};

export { validate, slugify };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
