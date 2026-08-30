import { validate, toMarkdown } from './news-bot.mjs';
import { writeFile, rm } from 'node:fs/promises';
import { execSync } from 'node:child_process';

let fails = 0;
const check = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) fails++; };

const good = {
  slug: 'test-story-slug',
  title: 'Carnival raises gratuities to $18.50 "per day"',
  description: 'A test description under 155 characters.',
  answer: 'A test answer of roughly forty to sixty words that opens the page and answers the headline directly, with no preamble at all, for testing purposes.',
  line: 'Carnival',
  topics: ['Money', 'Policy'],
  body: '## What changed?\n\nA test body with a table.\n\n| A | B |\n|---|---|\n| 1 | 2 |',
  sources: [{ claim: 'Rate change, with a "quoted" phrase', outlet: 'Carnival newsroom', tier: 1, date: '29 Aug 2026', url: 'https://example.com' }],
};

check('valid post passes', validate(good, new Set()).length === 0);
check('duplicate slug rejected', validate(good, new Set(['test-story-slug'])).length > 0);
check('unknown line rejected', validate({ ...good, line: 'Wat' }, new Set()).some(p => p.includes('unknown line')));
check('missing sources rejected', validate({ ...good, sources: [] }, new Set()).some(p => p.includes('no sources')));
check('bad tier rejected', validate({ ...good, sources: [{ claim: 'a', outlet: 'b', tier: 5 }] }, new Set()).length > 0);
check('em dash rejected', validate({ ...good, body: 'a — b' }, new Set()).some(p => p.includes('em dash')));
check('banned adverb rejected', validate({ ...good, body: 'this is actually fine' }, new Set()).some(p => p.includes('adverb')));
check('non-kebab slug rejected', validate({ ...good, slug: 'Not Kebab' }, new Set()).length > 0);

// the real test: does the emitted frontmatter survive the site's own YAML parser?
const md = toMarkdown(good);
await writeFile('src/content/news/__bot-test__.md', md);
let built = false;
try { execSync('npx astro build', { stdio: 'pipe' }); built = true; } catch (e) { console.log(String(e.stdout).slice(-600)); }
await rm('src/content/news/__bot-test__.md');
check('generated post builds (quotes survive YAML)', built);

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
