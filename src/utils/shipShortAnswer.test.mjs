import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { shipShortAnswer } from './shipShortAnswer.js';

const ships = JSON.parse(readFileSync(new URL('../data/ships.json', import.meta.url), 'utf8'));
const lines = JSON.parse(readFileSync(new URL('../data/lines.json', import.meta.url), 'utf8'));
const lineName = (id) => lines.find((l) => l.id === id)?.name ?? id;

function words(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

test('every ship short answer is 40 to 60 words and uses an/a', () => {
  for (const ship of ships) {
    const text = shipShortAnswer(ship, lineName(ship.line));
    const n = words(text);
    assert.ok(n >= 40 && n <= 60, `${ship.id} is ${n} words: ${text}`);
    assert.equal(text.includes(' a Icon-'), false);
    assert.equal(text.includes(' a Oasis-'), false);
    assert.equal(text.includes(' a Edge-'), false);
    assert.equal(text.includes(' a Excel-'), false);
    assert.ok(text.startsWith(ship.name), ship.id);
  }
});
