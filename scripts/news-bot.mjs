#!/usr/bin/env node
/**
 * No Fluff Cruising — automated cruise news.
 *
 * Runs on a schedule from GitHub Actions. Asks Claude to find genuinely new cruise
 * news across the lines this site covers, verify every claim against a named source
 * with the web search tool, and return finished posts in this site's frontmatter shape.
 *
 * Safety: nothing is committed unless it validates here AND the site still builds.
 * The workflow runs `astro build` after this script and refuses to push on failure.
 *
 * Conflict rule: when outlets disagree on a load-bearing fact, the post goes to
 * src/content/news-holds/ instead of publishing, so a human can decide.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const NEWS_DIR = 'src/content/news';
const HOLDS_DIR = 'src/content/news-holds';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
const MAX_POSTS = Number(process.env.MAX_POSTS || 3);
const MIN_POSTS_PER_DAY = Number(process.env.MIN_POSTS_PER_DAY || 3);
const API_KEY = process.env.ANTHROPIC_API_KEY;

const LINES = {
  'Royal Caribbean': 'royal-caribbean',
  'Carnival': 'carnival',
  'Norwegian': 'norwegian',
  'MSC': 'msc',
  'Disney': 'disney',
  'Celebrity': 'celebrity',
  'Virgin Voyages': 'virgin-voyages',
  'Princess': 'princess',
  'Margaritaville at Sea': 'margaritaville-at-sea',
};

const PREFERRED_SOURCES = [
  'Cruise line official press rooms and newsrooms (Tier 1)',
  'Royal Caribbean Blog',
  'The Points Guy (cruise coverage)',
  'Cruise Critic news',
  'Seatrade Cruise News',
  'Cruise News Radio',
  'Cruise Industry News',
  'Travel Weekly (cruise desk)',
  'Cruise Mapper news (when useful for deployments and itineraries)',
];

/** Everything already published, so the bot never repeats itself. */
async function existingCoverage() {
  const files = (await readdir(NEWS_DIR)).filter((f) => f.endsWith('.md'));
  const items = [];
  for (const f of files) {
    const raw = await readFile(path.join(NEWS_DIR, f), 'utf8');
    const title = raw.match(/^title:\s*"(.+?)"\s*$/m)?.[1] ?? f;
    const date = raw.match(/^publishDate:\s*(.+?)\s*$/m)?.[1] ?? '';
    items.push({ slug: f.replace(/\.md$/, ''), title, date });
  }
  return items.sort((a, b) => (a.date < b.date ? 1 : -1));
}

function publishedTodayCount(coverage, today) {
  return coverage.filter((c) => String(c.date).startsWith(today)).length;
}

const SCHEMA = `Return ONLY a JSON object, no prose and no code fence, shaped exactly:
{"posts":[{
  "slug": "kebab-case-url-slug",
  "title": "Headline, sentence case, under 70 characters",
  "description": "One sentence for search results and social cards, under 155 characters",
  "answer": "40 to 60 words answering the headline directly. This is the first thing on the page.",
  "line": "One of: ${Object.keys(LINES).join(' | ')}",
  "topics": ["one or two of: Itineraries, Ships, Ports, Policy, Money, Loyalty, Destinations, Sustainability, Dining, Drinks"],
  "body": "Markdown body, 300 to 600 words, a longer rewrite in site voice (not a paste of the source). Use ## subheadings. No H1. Tables allowed. Credit every outlet by name in the prose where a claim appears.",
  "conflict": false,
  "conflictNote": "If conflict is true: one sentence naming which outlets disagree and on what. Otherwise omit or empty string.",
  "sources": [{"claim":"what this source supports","outlet":"named outlet or the line's own newsroom","tier":1,"date":"29 Aug 2026","url":"https://..."}]
}]}`;

async function callClaude(coverage, { hoursWindow, wantCount }) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. You are writing cruise news for nofluffcruising.com.

Search the web for cruise news published in roughly the last ${hoursWindow} hours across these lines:
${Object.keys(LINES).join(', ')}.

Prefer these sources, and always name the original outlet with a date and URL when you can:
${PREFERRED_SOURCES.map((s) => `- ${s}`).join('\n')}

Deliberately look beyond Royal Caribbean. Carnival, Norwegian, MSC, Disney, Celebrity and
Virgin Voyages are under-covered by other cruise sites and are where this site can win.

ALREADY PUBLISHED ON THIS SITE — do not repeat any of these stories:
${coverage.slice(0, 40).map((c) => `- ${c.date} ${c.title}`).join('\n') || '(nothing yet)'}

Rules that override everything else:
1. Verify every factual claim with a search before you write it. Open the source.
2. Every claim needs a named outlet and a date in the sources array. Tier 1 is the
   cruise line's own published material. Tier 2 is an established cruise-news outlet.
3. If you cannot verify a figure, leave the figure out. Never estimate.
4. Do not invent stories to hit a quota. Returning fewer posts (or {"posts":[]}) is
   correct when nothing real cleared the bar. Weak filler is worse than a shortfall.
5. Aim for up to ${wantCount} posts this run (hard max ${MAX_POSTS}). Only things that
   change what a booked passenger pays or experiences.
6. Do not cover deals, discount roundups or listicles.
7. Write a longer rewrite in our voice. Do not paste or closely paraphrase long stretches
   of another outlet's article. Always credit the original source by name.
8. CONFLICT HOLD: if two or more outlets disagree on a load-bearing fact (dates, prices,
   ship names, cancellations, passenger impact), set "conflict": true, explain in
   conflictNote, still include sources for each side, and still return the draft. Do not
   pick a winner quietly.

Write in this voice, which is not negotiable:
<voice>
${await readFile('VOICE.md', 'utf8')}
</voice>

${SCHEMA}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 12000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 16 }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  if (!json) throw new Error('No JSON found in model response');
  return JSON.parse(json);
}

/** YAML-safe double-quoted scalar. */
const q = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ').trim()}"`;

export function validate(p, existingSlugs) {
  const problems = [];
  for (const f of ['slug', 'title', 'description', 'answer', 'line', 'body']) {
    if (!p[f] || typeof p[f] !== 'string' || !p[f].trim()) problems.push(`missing ${f}`);
  }
  if (!/^[a-z0-9-]+$/.test(p.slug || '')) problems.push('slug is not kebab-case');
  if (existingSlugs.has(p.slug)) problems.push('slug already exists');
  if (!LINES[p.line]) problems.push(`unknown line "${p.line}"`);
  if (!Array.isArray(p.sources) || p.sources.length === 0) problems.push('no sources');
  else for (const s of p.sources) {
    if (!s.claim || !s.outlet) problems.push('a source is missing claim or outlet');
    if (![1, 2].includes(Number(s.tier))) problems.push('a source has an invalid tier');
  }
  if ((p.body || '').includes('—')) problems.push('body contains an em dash');
  if (/\b(actually|exactly|simply|genuinely|quietly|basically)\b/i.test(p.body || '')) {
    problems.push('body contains a banned adverb');
  }
  if (p.conflict && !(p.conflictNote || '').trim()) {
    problems.push('conflict posts need a conflictNote');
  }
  return problems;
}

export function toMarkdown(p, { held = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const topics = (p.topics || []).filter(Boolean).slice(0, 2);
  const sources = p.sources.map((s) => {
    const rows = [
      `  - claim: ${q(s.claim)}`,
      `    outlet: ${q(s.outlet)}`,
      `    tier: ${Number(s.tier)}`,
    ];
    if (s.date) rows.push(`    date: ${q(s.date)}`);
    if (s.url && /^https?:\/\//.test(s.url)) rows.push(`    url: ${q(s.url)}`);
    if (s.note) rows.push(`    note: ${q(s.note)}`);
    return rows.join('\n');
  }).join('\n');

  const holdBlock = held
    ? `status: hold\nconflictNote: ${q(p.conflictNote)}\n`
    : '';

  return `---
title: ${q(p.title)}
description: ${q(p.description)}
answer: ${q(p.answer)}
presenter: Matthew
publishDate: ${today}
line: ${q(p.line)}
topics: [${topics.join(', ')}]
${holdBlock}sources:
${sources}
---

${p.body.trim()}
`;
}

const main = async () => {
  if (!API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set. Add it under Settings, Secrets and variables, Actions.');
    process.exit(1);
  }
  await mkdir(HOLDS_DIR, { recursive: true });
  const coverage = await existingCoverage();
  const existingSlugs = new Set(coverage.map((c) => c.slug));
  const today = new Date().toISOString().slice(0, 10);
  const alreadyToday = publishedTodayCount(coverage, today);
  const remainingForDay = Math.max(0, MIN_POSTS_PER_DAY - alreadyToday);
  const wantCount = Math.min(MAX_POSTS, Math.max(1, remainingForDay || 1));
  // If we are behind the daily floor, widen the research window.
  const hoursWindow = alreadyToday >= MIN_POSTS_PER_DAY ? 18 : 48;

  console.log(`Existing news posts: ${coverage.length}`);
  console.log(`Published today (${today}): ${alreadyToday}; aiming for up to ${wantCount} this run; window ${hoursWindow}h`);

  const { posts = [] } = await callClaude(coverage, { hoursWindow, wantCount });
  console.log(`Model returned ${posts.length} candidate post(s)`);

  let written = 0;
  let holds = 0;
  for (const p of posts.slice(0, MAX_POSTS)) {
    const problems = validate(p, existingSlugs);
    if (problems.length) {
      console.log(`REJECTED "${p.title ?? p.slug}": ${problems.join('; ')}`);
      continue;
    }
    if (p.conflict) {
      await writeFile(path.join(HOLDS_DIR, `${p.slug}.md`), toMarkdown(p, { held: true }), 'utf8');
      existingSlugs.add(p.slug);
      holds++;
      console.log(`HOLD ${p.slug}.md  [${p.line}] ${p.title} — ${p.conflictNote}`);
      continue;
    }
    await writeFile(path.join(NEWS_DIR, `${p.slug}.md`), toMarkdown(p), 'utf8');
    existingSlugs.add(p.slug);
    written++;
    console.log(`WROTE ${p.slug}.md  [${p.line}] ${p.title}`);
  }

  console.log(`\n${written} post(s) written. ${holds} hold(s) for review.`);
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(
      process.env.GITHUB_OUTPUT,
      `written=${written}\nholds=${holds}\nalready_today=${alreadyToday}\n`,
      { flag: 'a' },
    );
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
