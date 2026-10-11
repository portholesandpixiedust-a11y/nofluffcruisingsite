/**
 * Fails if a built sitemap URL is also a redirect source, or if a sitemap URL
 * has no static 200 file in dist/. Run after `npx astro build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isRedirectSource, resolvePublicPath, sitemapAllows } from '../src/utils/siteRedirects.js';
import { storiesForLine, storiesForShip } from '../src/utils/hubStories.js';
import { loadMarkdownEntries } from '../src/utils/contentFrontmatter.js';
import { newsHubSlug } from '../src/utils/newsLines.js';
import { relatedEntries } from '../src/utils/relatedContent.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

const dist = path.join(process.cwd(), 'dist');
if (!fs.existsSync(dist)) {
  console.error('FAIL  dist/ is missing. Run npx astro build first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
}

function outputFile(pathname) {
  const bare = pathname === '/' ? '' : pathname.replace(/^\//, '').replace(/\/$/, '');
  const candidates = [
    path.join(dist, bare, 'index.html'),
    path.join(dist, bare),
    path.join(dist, `${bare}.html`),
  ];
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
}

const sitemapFiles = walk(dist).filter((file) => /sitemap[^/]*\.xml$/.test(file));
check('build emitted a sitemap', sitemapFiles.length > 0);

const pageLocs = [];
for (const file of sitemapFiles) {
  for (const loc of locs(fs.readFileSync(file, 'utf8'))) {
    if (/\/sitemap[^/]*\.xml$/.test(loc)) continue;
    pageLocs.push(loc);
  }
}
check('sitemap lists pages', pageLocs.length > 0);

const blocked = [];
const missing = [];
const refresh = [];
for (const loc of pageLocs) {
  const pathname = new URL(loc).pathname;
  if (!sitemapAllows(loc) || isRedirectSource(pathname)) blocked.push(pathname);
  const file = outputFile(pathname);
  if (!file) {
    missing.push(pathname);
    continue;
  }
  if (file.endsWith('.html') || file.endsWith('.xml')) {
    const body = fs.readFileSync(file, 'utf8');
    if (/http-equiv=["']refresh["']/i.test(body)) refresh.push(pathname);
  }
}
check(`no sitemap URL is a redirect source (${blocked.length})`, blocked.length === 0);
if (blocked.length) console.error(blocked.slice(0, 20).join('\n'));
check(`every sitemap URL has a built file (${missing.length} missing)`, missing.length === 0);
if (missing.length) console.error(missing.slice(0, 20).join('\n'));
check(`no sitemap URL is an HTML refresh redirect (${refresh.length})`, refresh.length === 0);
if (refresh.length) console.error(refresh.slice(0, 20).join('\n'));

const absent = [
  '/reviews/every-royal-caribbean-ships-cdc-health-inspection-score-ranked-2026/',
  '/reviews/royal-caribbean-crown-and-anchor-tiers-what-each-one-is-worth-in-2026/',
  '/reviews/royal-caribbean-slots-or-video-poker-which-reaches-prime-for-less/',
  '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-chang/',
  '/rss.xml',
];
const present = new Set(pageLocs.map((loc) => new URL(loc).pathname));
for (const pathname of absent) check(`sitemap omits ${pathname}`, !present.has(pathname) && !present.has(pathname.replace(/\/$/, '')));
for (const pathname of [
  '/guides/royal-caribbean-cdc-health-inspection-scores-ranked/',
  '/guides/royal-caribbean-crown-anchor-tiers/',
  '/guides/royal-caribbean-slots-vs-video-poker/',
  '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-change/',
  '/news/brilliant-lady-cabo-ensenada-hurricane-rachel/',
  '/news/celebrity-millennium-kumamoto-fukuoka/',
  '/news/celebrity-reflection-bimini-perfect-day-cocacay/',
  '/news/royal-caribbean-2028-alaska-four-ships-booking/',
  '/guides/royal-caribbean-sandals-five-things-confirmed/',
]) {
  check(`sitemap includes canonical ${pathname}`, present.has(pathname));
}

function hrefPath(href) {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  const raw = href.split('#')[0].split('?')[0];
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.hostname !== 'nofluffcruising.com' && url.hostname !== 'www.nofluffcruising.com') return null;
      return url.pathname;
    } catch {
      return null;
    }
  }
  if (!raw.startsWith('/')) return null;
  return raw;
}

const htmlFiles = walk(dist).filter((file) => file.endsWith('.html'));
const linkHits = [];
for (const file of htmlFiles) {
  const rel = `/${path.relative(dist, file).split(path.sep).join('/')}`;
  const pagePath = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
  if (isRedirectSource(pagePath)) continue;
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\shref="([^"]*)"/g)) {
    const target = hrefPath(match[1]);
    if (target && isRedirectSource(target)) linkHits.push(`${pagePath} -> ${target}`);
  }
}
check(`built pages do not link at redirect sources (${linkHits.length})`, linkHits.length === 0);
if (linkHits.length) console.error(linkHits.slice(0, 30).join('\n'));

const sourceRoots = ['src/content', 'src/pages', 'src/layouts', 'src/components', 'src/data'];
const stubFiles = new Set([
  'src/content/reviews/every-royal-caribbean-ships-cdc-health-inspection-score-ranked-2026.md',
  'src/content/reviews/royal-caribbean-crown-and-anchor-tiers-what-each-one-is-worth-in-2026.md',
  'src/content/reviews/royal-caribbean-slots-or-video-poker-which-reaches-prime-for-less.md',
  'src/content/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-chang.md',
]);
function mentionsPath(text, pathname) {
  const bare = pathname.replace(/\/$/, '');
  const escaped = bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}/?(?![\\w-])`).test(text);
}

const sourceHits = [];
for (const root of sourceRoots) {
  for (const file of walk(path.join(process.cwd(), root))) {
    const rel = path.relative(process.cwd(), file).split(path.sep).join('/');
    if (stubFiles.has(rel) || !/\.(astro|md|js|mjs|json)$/.test(rel)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const pathname of absent.filter((item) => item !== '/rss.xml')) {
      if (mentionsPath(text, pathname)) sourceHits.push(`${rel} mentions ${pathname}`);
    }
  }
}
check(`source files do not mention redirecting review URLs (${sourceHits.length})`, sourceHits.length === 0);
if (sourceHits.length) console.error([...new Set(sourceHits)].slice(0, 30).join('\n'));

const news = loadMarkdownEntries(path.join(process.cwd(), 'src/content/news'));
const guides = loadMarkdownEntries(path.join(process.cwd(), 'src/content/guides'));
const ships = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/data/ships.json'), 'utf8'));

const lineMisses = [];
const hubHtml = new Map();
for (const post of news) {
  const hub = newsHubSlug(post.data.line);
  if (!hub) continue;
  if (!hubHtml.has(hub)) {
    const file = path.join(dist, 'news', hub, 'index.html');
    hubHtml.set(hub, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
  }
  const href = `/news/${post.id}/`;
  if (!hubHtml.get(hub).includes(`href="${href}"`)) lineMisses.push(`/news/${hub}/ missing ${href}`);
}
check(`every line hub links every story for that line (${lineMisses.length} missing)`, lineMisses.length === 0);
if (lineMisses.length) console.error(lineMisses.slice(0, 30).join('\n'));

const shipMisses = [];
for (const ship of ships) {
  const stories = storiesForShip(news, ship);
  if (stories.length === 0) continue;
  const file = path.join(dist, 'ships', ship.line, ship.id, 'index.html');
  if (!fs.existsSync(file)) {
    shipMisses.push(`missing ship page /ships/${ship.line}/${ship.id}/`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  for (const story of stories) {
    const href = `/news/${story.id}/`;
    if (!html.includes(`href="${href}"`)) shipMisses.push(`/ships/${ship.line}/${ship.id}/ missing ${href}`);
  }
}
check(`every ship hub links every story for that ship (${shipMisses.length} missing)`, shipMisses.length === 0);
if (shipMisses.length) console.error(shipMisses.slice(0, 30).join('\n'));

function pageHtml(section, id) {
  return fs.readFileSync(path.join(dist, section, id, 'index.html'), 'utf8');
}

const watched = [
  ['news', 'brilliant-lady-cabo-ensenada-hurricane-rachel', 'Related stories'],
  ['news', 'celebrity-millennium-kumamoto-fukuoka', 'Related stories'],
  ['news', 'celebrity-reflection-bimini-perfect-day-cocacay', 'Related stories'],
  ['news', 'royal-caribbean-2028-alaska-four-ships-booking', 'Related stories'],
  ['guides', 'royal-caribbean-slots-vs-video-poker', 'Related guides'],
  ['guides', 'royal-caribbean-sandals-five-things-confirmed', 'Related guides'],
];
for (const [section, id, heading] of watched) {
  const pool = section === 'news' ? news : guides;
  const current = pool.find((entry) => entry.id === id);
  const related = relatedEntries(current, pool);
  const html = pageHtml(section, id);
  check(`${id} renders ${heading}`, html.includes(`<h2>${heading}</h2>`));
  check(`${id} related block is 3 to 4 links`, related.length >= 3 && related.length <= 4);
  for (const item of related) {
    check(`${id} links /${section}/${item.id}/`, html.includes(`href="/${section}/${item.id}/"`));
  }
  const finalPath = resolvePublicPath(`/${section}/${id}/`);
  check(`${id} canonical path is itself`, finalPath === `/${section}/${id}/`);
}

const rss = fs.readFileSync(path.join(dist, 'rss.xml'), 'utf8');
check('RSS feed still builds', rss.includes('<rss') && rss.includes('<item>'));
check('RSS does not advertise a redirecting review URL', absent.filter((item) => item !== '/rss.xml').every((item) => !rss.includes(item)));
const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
check('homepage keeps the RSS alternate link', home.includes('rel="alternate"') && home.includes('href="/rss.xml"'));

console.log(fails ? `\n${fails} failing` : `\nall green (${pageLocs.length} sitemap URLs)`);
process.exit(fails ? 1 : 0);
