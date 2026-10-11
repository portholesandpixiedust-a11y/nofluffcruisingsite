import path from 'node:path';
import { loadMarkdownEntries } from './contentFrontmatter.js';
import { relatedEntries } from './relatedContent.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

const root = process.cwd();
const news = loadMarkdownEntries(path.join(root, 'src/content/news'));
const guides = loadMarkdownEntries(path.join(root, 'src/content/guides'));

function ids(entries) {
  return entries.map((entry) => entry.id);
}

function relatedTo(pool, id) {
  const current = pool.find((entry) => entry.id === id);
  return relatedEntries(current, pool);
}

function inbound(pool, id) {
  return pool.filter((entry) => entry.id !== id && ids(relatedEntries(entry, pool)).includes(id));
}

const cabo = relatedTo(news, 'brilliant-lady-cabo-ensenada-hurricane-rachel');
check('Cabo story has 3 to 4 related stories', cabo.length >= 3 && cabo.length <= 4);
check('Cabo related stays on Virgin', cabo.every((entry) => entry.data.line === 'Virgin Voyages'));
check('Cabo related prefers Brilliant Lady', cabo.some((entry) => (entry.data.ships ?? []).includes('Brilliant Lady')));

const millennium = relatedTo(news, 'celebrity-millennium-kumamoto-fukuoka');
const reflection = relatedTo(news, 'celebrity-reflection-bimini-perfect-day-cocacay');
check('Kumamoto story has 3 to 4 related stories', millennium.length >= 3 && millennium.length <= 4);
check('Reflection story has 3 to 4 related stories', reflection.length >= 3 && reflection.length <= 4);
check('Kumamoto and Reflection link to each other', ids(millennium).includes('celebrity-reflection-bimini-perfect-day-cocacay') && ids(reflection).includes('celebrity-millennium-kumamoto-fukuoka'));
check('Kumamoto links the other Millennium sailing', ids(millennium).includes('celebrity-millennium-skips-shimizu-extra-kagoshima'));

const alaska = relatedTo(news, 'royal-caribbean-2028-alaska-four-ships-booking');
check('Alaska story has 3 to 4 related stories', alaska.length >= 3 && alaska.length <= 4);
check('Alaska related stays on Royal Caribbean', alaska.every((entry) => entry.data.line === 'Royal Caribbean'));
check('Voyager Japan story links the Alaska story', ids(relatedTo(news, 'royal-caribbean-voyager-japan-spring-2028')).includes('royal-caribbean-2028-alaska-four-ships-booking'));

const slots = relatedTo(guides, 'royal-caribbean-slots-vs-video-poker');
const sandals = relatedTo(guides, 'royal-caribbean-sandals-five-things-confirmed');
check('Slots guide has 3 to 4 related guides', slots.length >= 3 && slots.length <= 4);
check('Sandals guide has 3 to 4 related guides', sandals.length >= 3 && sandals.length <= 4);
check('Slots and Sandals link to each other', ids(slots).includes('royal-caribbean-sandals-five-things-confirmed') && ids(sandals).includes('royal-caribbean-slots-vs-video-poker'));
check('Casino changes guide links the slots guide', ids(relatedTo(guides, 'royal-caribbean-casino-changes')).includes('royal-caribbean-slots-vs-video-poker'));
check('Crown & Anchor guide links Sandals', ids(relatedTo(guides, 'royal-caribbean-crown-anchor-tiers')).includes('royal-caribbean-sandals-five-things-confirmed'));

const targets = [
  ['news', 'brilliant-lady-cabo-ensenada-hurricane-rachel'],
  ['news', 'celebrity-millennium-kumamoto-fukuoka'],
  ['news', 'celebrity-reflection-bimini-perfect-day-cocacay'],
  ['news', 'royal-caribbean-2028-alaska-four-ships-booking'],
  ['guides', 'royal-caribbean-slots-vs-video-poker'],
  ['guides', 'royal-caribbean-sandals-five-things-confirmed'],
];
for (const [kind, id] of targets) {
  const pool = kind === 'news' ? news : guides;
  const hits = inbound(pool, id);
  check(`${id} is linked from at least one sibling`, hits.length >= 1);
}

const otherLine = {
  id: 'carnival-money',
  data: { line: 'Carnival Cruise Line', ships: [], topics: ['Loyalty'], publishDate: '2026-10-01' },
};
const sameLinePlain = {
  id: 'rc-plain',
  data: { line: 'Royal Caribbean', ships: [], topics: ['Fleet'], publishDate: '2026-10-11' },
};
const current = {
  id: 'rc-loyalty',
  data: { line: 'Royal Caribbean', ships: [], topics: ['Loyalty'], publishDate: '2026-09-01' },
};
const ranked = ids(relatedEntries(current, [current, otherLine, sameLinePlain, ...guides.filter((entry) => entry.id === 'royal-caribbean-sandals-five-things-confirmed')]));
check('same line ranks ahead of a closer other-line topic', ranked[0] !== 'carnival-money');
check('shared topic inside the line ranks ahead of a newer unrelated line mate', ranked.indexOf('royal-caribbean-sandals-five-things-confirmed') < ranked.indexOf('rc-plain'));

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
