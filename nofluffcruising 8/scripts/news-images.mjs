#!/usr/bin/env node
/**
 * No Fluff Cruising — find a real, credited photo for every news post.
 *
 * A generic stock ocean on a story about a specific ship reads as filler. This finds a
 * freely licensed photograph of the actual subject on Wikimedia Commons, downloads it
 * into public/news/, and writes the photographer and licence into the post's frontmatter
 * so the credit renders under the image.
 *
 * Licence handling is deliberately strict. Only public domain and CC BY / CC BY-SA are
 * accepted. Anything else, including anything marked non-commercial or fair use, is
 * skipped and the post keeps the house fallback image.
 *
 * Runs over every news post that has no hero image, so it both fills in new stories and
 * backfills old ones.
 */

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const NEWS_DIR = 'src/content/news';
const OUT_DIR = 'public/news';
const UA = 'NoFluffCruisingBot/1.0 (https://nofluffcruising.com; site image credit bot)';

// Only licences that permit commercial reuse with attribution.
const ALLOWED = [
  /^cc0/i, /^public domain/i, /^pd/i,
  /^cc[- ]by(?![- ]nc)/i,           // CC BY and CC BY-SA, but never CC BY-NC
];
const BLOCKED = /non[- ]?commercial|nc\b|nd\b|fair use|copyright/i;

const stripTags = (html = '') =>
  html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

async function commonsSearch(subject) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `${subject} ship`, gsrnamespace: '6',
    gsrlimit: '8', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '1600', format: 'json', origin: '*',
  });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons ${res.status}`);
  const data = await res.json();
  return Object.values(data?.query?.pages ?? {});
}

function pickUsable(pages) {
  for (const page of pages) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    if (!/^image\/(jpeg|png)$/.test(ii.mime || '')) continue;
    if (!ii.thumburl) continue;
    if ((ii.width ?? 0) < 900) continue;

    const em = ii.extmetadata ?? {};
    const licence = stripTags(em.LicenseShortName?.value || em.UsageTerms?.value || '');
    if (!licence) continue;
    if (BLOCKED.test(licence) && !/^cc[- ]by[- ]sa/i.test(licence)) continue;
    if (!ALLOWED.some((re) => re.test(licence))) continue;

    const artist = stripTags(em.Artist?.value || em.Credit?.value || '') || 'Wikimedia Commons';
    return {
      thumburl: ii.thumburl,
      descriptionurl: ii.descriptionurl || page.title,
      artist: artist.slice(0, 90),
      licence,
      licenceUrl: stripTags(em.LicenseUrl?.value || ''),
      title: page.title,
    };
  }
  return null;
}

/** Work out what the story is actually about, so the photo is not decorative. */
async function subjectFor(fm, body) {
  const hay = `${fm.title ?? ''} ${fm.description ?? ''}`;
  const ships = JSON.parse(await readFile('src/data/ships.json', 'utf8'));
  for (const s of ships) if (hay.includes(s.name)) return s.name;

  const patterns = [
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)? of the Seas)\b/,
    /\b(Carnival [A-Z][a-z]+)\b/, /\b(MSC [A-Z][a-z]+)\b/,
    /\b(Norwegian [A-Z][a-z]+)\b/, /\b(Disney [A-Z][a-z]+)\b/,
    /\b(Celebrity [A-Z][a-z]+)\b/, /\b([A-Z][a-z]+ Lady)\b/,
    /\b([A-Z][a-z]+ Princess)\b/,
  ];
  for (const re of patterns) { const m = hay.match(re); if (m) return m[1]; }
  return fm.line ? `${fm.line} cruise` : null;
}

const parseFm = (raw) => {
  const fm = {};
  const block = raw.split('---')[1] ?? '';
  for (const key of ['title', 'description', 'line']) {
    fm[key] = block.match(new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, 'm'))?.[1];
  }
  fm.hasHero = /^heroImage:/m.test(block);
  return fm;
};

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(NEWS_DIR)).filter((f) => f.endsWith('.md'));
  let added = 0, skipped = 0;

  for (const file of files) {
    const full = path.join(NEWS_DIR, file);
    const raw = await readFile(full, 'utf8');
    const fm = parseFm(raw);
    if (fm.hasHero) { skipped++; continue; }

    const slug = file.replace(/\.md$/, '');
    const subject = await subjectFor(fm, raw);
    if (!subject) { console.log(`SKIP  ${slug}: no subject could be identified`); continue; }

    let hit = null;
    try { hit = pickUsable(await commonsSearch(subject)); }
    catch (e) { console.log(`SKIP  ${slug}: Commons lookup failed (${e.message})`); continue; }
    if (!hit) { console.log(`SKIP  ${slug}: no freely licensed photo of "${subject}"`); continue; }

    const dest = path.join(OUT_DIR, `${slug}.jpg`);
    if (!(await access(dest).then(() => true).catch(() => false))) {
      const img = await fetch(hit.thumburl, { headers: { 'User-Agent': UA } });
      if (!img.ok) { console.log(`SKIP  ${slug}: image download ${img.status}`); continue; }
      await writeFile(dest, Buffer.from(await img.arrayBuffer()));
    }

    const q = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    const inject = [
      `heroImage: "/news/${slug}.jpg"`,
      `imageSubject: ${q(subject)}`,
      `heroCredit:`,
      `  text: ${q(`Photo: ${hit.artist}`)}`,
      `  url: ${q(hit.descriptionurl)}`,
      `  license: ${q(hit.licence)}`,
      ...(hit.licenceUrl ? [`  licenseUrl: ${q(hit.licenceUrl)}`] : []),
    ].join('\n');

    // Slot the image fields in right after the title line.
    const updated = raw.replace(/^(title:.*)$/m, `$1\n${inject}`);
    await writeFile(full, updated, 'utf8');
    added++;
    console.log(`IMAGE ${slug}  "${subject}"  ${hit.artist} (${hit.licence})`);
  }

  console.log(`\n${added} image(s) added, ${skipped} post(s) already had one.`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `images=${added}\n`, { flag: 'a' });
  }
};

export { pickUsable, stripTags, subjectFor };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
