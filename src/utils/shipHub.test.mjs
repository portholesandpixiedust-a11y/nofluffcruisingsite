import assert from 'node:assert/strict';
import test from 'node:test';
import { rebuiltShipIds, shipHub, shipPageIncludesProduct } from './shipHub.js';

const FULL = [
  'carnival-paradise',
  'carnival-firenze',
  'carnival-horizon',
  'carnival-spirit',
  'carnival-sunrise',
  'wonder-of-the-seas',
  'disney-dream',
  'msc-poesia',
];

const BRIEF = [
  'carnival-mardi-gras',
  'freedom-of-the-seas',
  'carnival-dream',
  'carnival-jubilee',
  'carnival-magic',
];

const REQUIRED = [...FULL, ...BRIEF];

const BANNED = /\b(actually|actual|exactly|simply|genuinely|quietly|honestly|basically)\b/i;

function walkStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walkStrings(v, out));
  return out;
}

test('rebuilt hubs omit Product schema and other ships keep it', () => {
  assert.deepEqual(rebuiltShipIds, REQUIRED);
  for (const id of REQUIRED) assert.equal(shipPageIncludesProduct(id), false, id);
  assert.equal(shipPageIncludesProduct('icon-of-the-seas'), true);
  assert.equal(shipHub('icon-of-the-seas'), null);
});

function assertSearchCopy(id, hub) {
  assert.ok(hub.title.length >= 45 && hub.title.length <= 60, `${id} title ${hub.title.length}`);
  assert.match(hub.title, /cruise ship/i, id);
  assert.ok(hub.description.length >= 140 && hub.description.length <= 155, `${id} description ${hub.description.length}`);
  assert.match(hub.h1, /cruise ship$/, id);
  assert.ok(hub.lead.length > 80, id);
  assert.ok(hub.facts.length >= 5, id);
  assert.equal(typeof hub.cdc.score, 'number', id);
  assert.match(hub.cdc.url, /^https:\/\/wwwn\.cdc\.gov\//, id);
  for (const fact of hub.facts) {
    assert.ok(fact.label && fact.value && fact.source && fact.url && fact.checked, `${id} ${fact.label}`);
  }
  for (const source of hub.sources) {
    assert.ok(source.claim && source.outlet, id);
    assert.ok(source.tier === 1 || source.tier === 2, id);
  }
  const text = walkStrings(hub).join('\n');
  assert.equal(text.includes('\u2014'), false, id);
  assert.equal(text.includes('!'), false, id);
  assert.equal(BANNED.test(text), false, `${id} banned word`);
  assert.equal(/Matthew sailed|sailed Princess/i.test(text), false, id);
  assert.match(text, /does not describe a sailing we took/, id);
}

test('each full hub is sourced and has guest sections', () => {
  for (const id of FULL) {
    const hub = shipHub(id);
    assert.ok(hub, id);
    assert.deepEqual(hub.sections.map((s) => s.heading), ['Dining', 'Entertainment', 'Cabins'], id);
    assert.ok(hub.sources.length >= 2, id);
    assertSearchCopy(id, hub);
  }
});

test('each brief hub stays short and sourced', () => {
  for (const id of BRIEF) {
    const hub = shipHub(id);
    assert.ok(hub, id);
    assert.equal(hub.sections, undefined, id);
    assert.ok(hub.sources.length >= 1, id);
    assertSearchCopy(id, hub);
  }
});
