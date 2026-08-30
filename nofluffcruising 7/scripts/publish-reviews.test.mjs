import { validate, slugify } from './publish-reviews.mjs';

let fails = 0;
const check = (n, c) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`); if (!c) fails++; };

const good = `---
title: "Celebrity Beyond Review: An Honest Reality Check"
description: "A description."
answer: "An answer."
presenter: Matthew
publishDate: 2026-08-02
line: Celebrity
video:
  id: BVN7d6RxG_U
  title: "Celebrity Beyond Gave Me a Reality Check"
sources: []
---

${'word '.repeat(320)}`;

check('valid draft passes', validate(good).length === 0);
check('review header rejected', validate(good.replace('---\n\nword', '---\n\nDRAFT FOR APPROVAL word')).some(p => p.includes('review header')));
check('embed placeholder rejected', validate(good.replace('word ', '[VIDEO EMBED: x] ')).some(p => p.includes('embed placeholder')));
check('short body rejected', validate(good.split('---').slice(0,2).join('---') + '---\n\ntoo short').some(p => p.includes('too short')));
check('missing frontmatter rejected', validate('no frontmatter here').length > 0);
check('missing sources rejected', validate(good.replace('sources: []', '')).some(p => p.includes('sources')));
check('slugify handles ampersand', slugify('Royal Caribbean Crown & Anchor Tiers') === 'royal-caribbean-crown-and-anchor-tiers');
check('slugify strips apostrophes', slugify("Royal Caribbean's CEO") === 'royal-caribbeans-ceo');

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
