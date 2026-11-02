/**
 * Checks built news HTML for NewsArticle, FAQPage, breadcrumbs, line hubs,
 * and the Google News sitemap. Run after `npx astro build`.
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.join(process.cwd(), 'dist');
let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

if (!fs.existsSync(dist)) {
  console.error('FAIL  dist/ is missing. Run npx astro build first.');
  process.exit(1);
}

function read(rel) {
  const file = path.join(dist, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function graphs(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap((match) => {
      const data = JSON.parse(match[1]);
      return Array.isArray(data) ? data : [data];
    });
}

function words(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

const BACKFILL = [
  'news/royal-caribbean-labadee-calls-through-april-2028/index.html',
  'news/ambassador-enermoves-shore-power-renaissance/index.html',
  'news/royal-princess-singapore-dry-dock-sanctuary-collection/index.html',
  'news/ambition-norway-port-swap-storms-austen-boelo-october-2026/index.html',
  'news/norwegian-joy-seattle-customs-delay/index.html',
  'news/iona-getxo-cancelled-storm-austen-october-2026/index.html',
  'news/ventura-southampton-delay-cherbourg-cancelled-october-2026/index.html',
  'news/storm-austen-southampton-arvia-virtuosa-preziosa-october-2026/index.html',
];

const HUB_STORIES = {
  'news/royal-caribbean-labadee-calls-through-april-2028/index.html': '/news/royal-caribbean/',
  'news/royal-princess-singapore-dry-dock-sanctuary-collection/index.html': '/news/princess/',
  'news/norwegian-joy-seattle-customs-delay/index.html': '/news/norwegian/',
  'news/storm-austen-southampton-arvia-virtuosa-preziosa-october-2026/index.html': '/news/msc/',
  'news/ambition-norway-port-swap-storms-austen-boelo-october-2026/index.html': '/news/ambassador/',
  'news/iona-getxo-cancelled-storm-austen-october-2026/index.html': '/news/p-and-o/',
  'news/ventura-southampton-delay-cherbourg-cancelled-october-2026/index.html': '/news/p-and-o/',
};

function walkNews(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkNews(full, out);
    else if (name === 'index.html') out.push(full);
  }
  return out;
}

const newsRoot = path.join(dist, 'news');
const storyFiles = walkNews(newsRoot).filter((file) => (
  fs.readFileSync(file, 'utf8').includes('"@type":"NewsArticle"')
));

check('news stories were built', storyFiles.length > 20);

for (const file of storyFiles) {
  const rel = path.relative(dist, file);
  const html = fs.readFileSync(file, 'utf8');
  const nodes = graphs(html);
  const article = nodes.find((node) => node['@type'] === 'NewsArticle');
  const label = rel.replace('/index.html', '');
  check(`${label} NewsArticle`, Boolean(article));
  if (!article) continue;
  const author = article.author || {};
  const logo = article.publisher?.logo || {};
  const image = Array.isArray(article.image) ? article.image[0] : article.image;
  check(`${label} headline`, typeof article.headline === 'string' && article.headline.length > 0);
  check(`${label} dates`, typeof article.datePublished === 'string' && typeof article.dateModified === 'string');
  check(`${label} author Matthew`, author['@type'] === 'Person' && author.name === 'Matthew' && String(author.url).endsWith('/matthew/'));
  check(`${label} publisher logo`, article.publisher?.['@type'] === 'Organization' && article.publisher.name === 'No Fluff Cruising' && logo['@type'] === 'ImageObject' && typeof logo.url === 'string');
  check(`${label} image`, typeof image?.url === 'string' && image.url.startsWith('http'));
  check(`${label} mainEntityOfPage`, article.mainEntityOfPage?.['@type'] === 'WebPage' && typeof article.mainEntityOfPage['@id'] === 'string');
  const h1 = html.indexOf('<h1>');
  const tldr = html.indexOf('<b>TL;DR</b>');
  const byline = html.indexOf('class="byline"');
  check(`${label} TL;DR under H1`, h1 >= 0 && tldr > h1 && (byline === -1 || tldr < byline));
  const bylineHtml = html.slice(byline, byline + 400);
  check(`${label} byline is Matthew`, bylineHtml.includes('>Matthew</a>'));
}

for (const rel of BACKFILL) {
  const html = read(rel);
  const faq = graphs(html).find((node) => node['@type'] === 'FAQPage');
  const answers = faq?.mainEntity?.map((item) => item.acceptedAnswer?.text) ?? [];
  check(`${rel} has 3 FAQ answers`, answers.length === 3 && answers.every((answer) => {
    const count = words(answer);
    return count >= 40 && count <= 50;
  }));
  check(`${rel} FAQ section`, html.includes('id="faq-h"'));
}

for (const [rel, hub] of Object.entries(HUB_STORIES)) {
  const crumbs = graphs(read(rel)).find((node) => node['@type'] === 'BreadcrumbList');
  const items = crumbs?.itemListElement ?? [];
  check(`${rel} breadcrumb links ${hub}`, items.some((item) => String(item.item).endsWith(hub)));
}

const hubHtml = read('news/royal-caribbean/index.html');
const hubNodes = graphs(hubHtml);
const collection = hubNodes.find((node) => node['@type'] === 'CollectionPage');
check('Royal Caribbean hub H1', hubHtml.includes('<h1 class="masthead">Royal Caribbean Cruise News</h1>'));
check('Royal Caribbean hub dated intro', /Latest Royal Caribbean cruise news, updated [A-Z][a-z]{2} \d{1,2}, \d{4}\./.test(hubHtml));
check('Royal Caribbean hub CollectionPage', collection?.name === 'Royal Caribbean Cruise News');
check('Royal Caribbean hub ItemList', collection?.mainEntity?.['@type'] === 'ItemList' && collection.mainEntity.numberOfItems > 0);

const sitemap = read('news-sitemap.xml');
check('news sitemap publication', sitemap.includes('<news:name>No Fluff Cruising</news:name>') && sitemap.includes('<news:language>en</news:language>'));
check('news sitemap is a urlset', sitemap.includes('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"'));
const recent = [
  'https://nofluffcruising.com/news/royal-caribbean-labadee-calls-through-april-2028/',
  'https://nofluffcruising.com/news/ambassador-enermoves-shore-power-renaissance/',
  'https://nofluffcruising.com/news/royal-princess-singapore-dry-dock-sanctuary-collection/',
];
const builtAt = new Date();
const nov2 = new Date('2026-11-02T13:18:00Z');
if (builtAt.getTime() - nov2.getTime() <= 48 * 60 * 60 * 1000) {
  check('news sitemap includes 2 Nov stories', recent.every((url) => sitemap.includes(`<loc>${url}</loc>`)));
} else {
  check('news sitemap omits stories older than 48 hours', recent.every((url) => !sitemap.includes(`<loc>${url}</loc>`)));
}

const robots = read('robots.txt');
check('robots.txt lists the news sitemap', robots.includes('Sitemap: https://nofluffcruising.com/news-sitemap.xml'));

const cdc = read('guides/royal-caribbean-cdc-health-inspection-scores-ranked/index.html');
const bella = read('news/norwegian-bella-ship-itinerary-debut-may-2028/index.html');
check('CDC title is specific and under 60 characters', /<title>[^<]{1,60}<\/title>/.test(cdc) && cdc.includes('low is 92'));
check('CDC meta description under 155 characters', (cdc.match(/<meta name="description" content="([^"]*)"/)?.[1] || '').length <= 155);
check('Bella title under 60 characters', /<title>[^<]{1,60}<\/title>/.test(bella) && bella.includes('Barcelona'));
check('Bella meta description under 155 characters', (bella.match(/<meta name="description" content="([^"]*)"/)?.[1] || '').length <= 155);

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
