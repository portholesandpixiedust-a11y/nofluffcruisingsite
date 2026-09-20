#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const NEWS_DIR = 'src/content/news';
const OUT_DIR = 'public/news';
const UA = 'NoFluffCruisingBot/1.0 (https://nofluffcruising.com; site image credit bot)';

const ALLOWED = [
  /^cc0/i, /^public domain/i, /^pd/i,
  /^cc[- ]by(?![- ]nc)/i,
];
const BLOCKED = /non[- ]?commercial|nc\b|nd\b|fair use|copyright/i;

const OUTLET_LABEL = {
  'cruisehive.com': 'Cruise Hive',
  'www.cruisehive.com': 'Cruise Hive',
  'cruiseindustrynews.com': 'Cruise Industry News',
  'www.cruiseindustrynews.com': 'Cruise Industry News',
  'www.travelerstoday.com': 'Travelers Today',
  'travelerstoday.com': 'Travelers Today',
  'alaskapublic.org': 'Alaska Public Media',
  'www.adn.com': 'Anchorage Daily News',
  'www.virginvoyages.com': 'Virgin Voyages',
  'virginvoyages.com': 'Virgin Voyages',
};

const SUBJECT_OVERRIDES = {
  'oasis-of-the-seas-medical-delay-port-canaveral-cancelled': ['Oasis of the Seas'],
  'royal-princess-alaska-ports-cancelled-50-percent-refund': ['Royal Princess'],
  'brilliant-lady-ends-first-virgin-alaska-season': ['Brilliant Lady', 'Scarlet Lady Virgin Voyages'],
  'virgin-sisters-at-sea-four-ships-february-2027': ['Scarlet Lady', 'Virgin Voyages Scarlet Lady'],
  'msc-world-asia-sea-trials-december-debut': ['MSC World Europa', 'MSC World America'],
  'norwegian-joy-sitka-whale-delay': ['Norwegian Joy'],
  'norwegian-jade-whittier-dock-fire': ['Norwegian Jade', 'Whittier Alaska cruise'],
  'disney-wish-port-canaveral-terminal-swap': ['Disney Wish'],
  'royal-caribbean-2028-2029-itinerary-release-dates': ['Icon of the Seas', 'Oasis of the Seas'],
  'carnival-venezia-manhattan-arrive-on-time-warning': ['Carnival Venezia'],
};

const stripTags = (html = '') =>
  html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

const q = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function outletFor(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return OUTLET_LABEL[host] || host;
  } catch {
    return 'source';
  }
}

function extractSourceUrls(raw) {
  const block = raw.split('---')[1] ?? '';
  return [...block.matchAll(/^\s*-\s*url:\s*"?(https?:\/\/[^"\n]+)"?\s*$/gm)].map((m) => m[1].trim());
}

function metaImages(html, base) {
  const imgs = [];
  const push = (u) => { if (u) imgs.push(u); };
  for (const re of [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
  ]) {
    for (const m of html.matchAll(re)) push(m[1]);
  }
  const out = [];
  const seen = new Set();
  for (let u of imgs) {
    u = u.trim();
    if (!u || u.startsWith('data:')) continue;
    try { u = new URL(u, base).href; } catch { continue; }
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

async function imageFromSourceArticle(articleUrl) {
  const res = await fetch(articleUrl, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`source page ${res.status}`);
  const html = await res.text();
  const finalUrl = res.url || articleUrl;
  const candidates = metaImages(html, finalUrl);
  for (const c of candidates) {
    const low = c.toLowerCase();
    if (/(logo|avatar|icon|sprite|pixel|gravatar|wp-includes|\.svg)(\b|$)/i.test(low)) continue;
    return {
      kind: 'source',
      imageUrl: c,
      articleUrl,
      credit: `Photo: ${outletFor(articleUrl)} · ${articleUrl}`,
    };
  }
  return null;
}

async function commonsSearch(subject) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: `${subject} ship`, gsrnamespace: '6',
    gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|extmetadata|mime|size',
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
      kind: 'commons',
      imageUrl: ii.thumburl,
      credit: `Photo: ${artist.slice(0, 90)} (${licence}) · Wikimedia Commons · ${ii.descriptionurl || page.title}`,
    };
  }
  return null;
}

async function subjectFor(slug, fm) {
  if (SUBJECT_OVERRIDES[slug]) return SUBJECT_OVERRIDES[slug];
  const hay = `${fm.title ?? ''} ${fm.description ?? ''}`;
  const ships = JSON.parse(await readFile('src/data/ships.json', 'utf8'));
  for (const s of ships) if (hay.includes(s.name)) return [s.name];
  const patterns = [
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)? of the Seas)\b/,
    /\b(Carnival [A-Z][a-z]+)\b/, /\b(MSC [A-Z][a-z]+)\b/,
    /\b(Norwegian [A-Z][a-z]+)\b/, /\b(Disney [A-Z][a-z]+)\b/,
    /\b(Celebrity [A-Z][a-z]+)\b/, /\b([A-Z][a-z]+ Lady)\b/,
    /\b([A-Z][a-z]+ Princess)\b/,
  ];
  for (const re of patterns) { const m = hay.match(re); if (m) return [m[1]]; }
  return fm.line ? [`${fm.line} cruise`] : [];
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

async function resolveHit(slug, fm, raw) {
  for (const articleUrl of extractSourceUrls(raw)) {
    try {
      const hit = await imageFromSourceArticle(articleUrl);
      if (hit) return hit;
    } catch (e) {
      console.log(`WARN  ${slug}: source ${articleUrl} (${e.message})`);
    }
  }
  const subjects = await subjectFor(slug, fm);
  for (const subject of subjects) {
    try {
      const hit = pickUsable(await commonsSearch(subject));
      if (hit) return hit;
    } catch (e) {
      console.log(`WARN  ${slug}: Commons "${subject}" (${e.message})`);
    }
  }
  return null;
}

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(NEWS_DIR)).filter((f) => f.endsWith('.md'));
  let added = 0, skipped = 0;
  const force = process.argv.includes('--force');

  for (const file of files) {
    const full = path.join(NEWS_DIR, file);
    const raw = await readFile(full, 'utf8');
    const fm = parseFm(raw);
    if (fm.hasHero && !force) { skipped++; continue; }

    const slug = file.replace(/\.md$/, '');
    const hit = await resolveHit(slug, fm, raw);
    if (!hit) { console.log(`SKIP  ${slug}: no source or Commons image`); continue; }

    const dest = path.join(OUT_DIR, `${slug}.jpg`);
    const needDl = !(await access(dest).then(() => true).catch(() => false)) || force;
    if (needDl) {
      const img = await fetch(hit.imageUrl, {
        headers: { 'User-Agent': UA, ...(hit.articleUrl ? { Referer: hit.articleUrl } : {}) },
      });
      if (!img.ok) { console.log(`SKIP  ${slug}: image download ${img.status}`); continue; }
      await writeFile(dest, Buffer.from(await img.arrayBuffer()));
    }

    const inject = [
      `heroImage: "/news/${slug}.jpg"`,
      `heroCredit: ${q(hit.credit)}`,
    ].join('\n');

    let body = raw;
    if (force && fm.hasHero) {
      body = body
        .replace(/^heroImage:.*\n/m, '')
        .replace(/^imageSubject:.*\n/m, '')
        .replace(/^imageSource:.*\n/m, '')
        .replace(/^heroCredit:.*\n(?: {2}\w+:.*\n)*/m, '');
    }

    const updated = body.replace(/^(title:.*)$/m, `$1\n${inject}`);
    await writeFile(full, updated, 'utf8');
    added++;
    console.log(`IMAGE ${slug}  [${hit.kind}]  ${hit.credit.slice(0, 100)}`);
  }

  console.log(`\n${added} image(s) added, ${skipped} post(s) already had one.`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `images=${added}\n`, { flag: 'a' });
  }
};

export { pickUsable, stripTags, subjectFor, imageFromSourceArticle, metaImages };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
