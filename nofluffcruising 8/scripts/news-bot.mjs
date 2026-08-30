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
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const NEWS_DIR = 'src/content/news';
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
const MAX_POSTS = Number(process.env.MAX_POSTS || 3);
const API_KEY = process.env.ANTHROPIC_API_KEY;
// Only needed when the API key is identity-linked and not scoped to a single workspace.
const WORKSPACE_ID = process.env.ANTHROPIC_WORKSPACE_ID;

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

const SCHEMA = `Return ONLY a JSON object, no prose and no code fence, shaped exactly:
{"posts":[{
  "slug": "kebab-case-url-slug",
  "title": "Headline, sentence case, under 70 characters",
  "description": "One sentence for search results and social cards, under 155 characters",
  "answer": "40 to 60 words answering the headline directly. This is the first thing on the page.",
  "line": "One of: ${Object.keys(LINES).join(' | ')}",
  "topics": ["one or two of: Itineraries, Ships, Ports, Policy, Money, Loyalty, Destinations, Sustainability, Dining, Drinks"],
  "body": "Markdown body, 200 to 400 words, using ## subheadings written as questions where natural. No H1. Tables allowed.",
  "sources": [{"claim":"what this source supports","outlet":"named outlet or the line's own newsroom","tier":1,"date":"29 Aug 2026","url":"https://..."}]
}]}`;

async function callClaude(coverage) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `Today is ${today}. You are writing cruise news for nofluffcruising.com.

Search the web for cruise news published in roughly the last 18 hours across these lines:
${Object.keys(LINES).join(', ')}.

Deliberately look beyond Royal Caribbean. Carnival, Norwegian, MSC, Disney, Celebrity and
Virgin Voyages are under-covered by other cruise sites and are where this site can win.

ALREADY PUBLISHED ON THIS SITE — do not repeat any of these stories:
${coverage.slice(0, 40).map((c) => `- ${c.date} ${c.title}`).join('\n') || '(nothing yet)'}

Rules that override everything else:
1. Verify every factual claim with a search before you write it. Open the source.
2. Every claim needs a named outlet and a date in the sources array. Tier 1 is the
   cruise line's own published material. Tier 2 is an established cruise-news outlet.
3. If you cannot verify a figure, leave the figure out. Never estimate.
4. Publish nothing rather than padding. Returning {"posts":[]} is a correct answer on a
   quiet day and is strongly preferred over a weak story.
5. At most ${MAX_POSTS} posts. Only things that change what a booked passenger pays or experiences.
6. Do not cover deals, discount roundups or listicles.

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
      ...(WORKSPACE_ID ? { 'anthropic-workspace-id': WORKSPACE_ID } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
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
  return problems;
}

export function toMarkdown(p) {
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

  return `---
title: ${q(p.title)}
description: ${q(p.description)}
answer: ${q(p.answer)}
presenter: Matthew
publishDate: ${today}
line: ${q(p.line)}
topics: [${topics.join(', ')}]
sources:
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
  const coverage = await existingCoverage();
  const existingSlugs = new Set(coverage.map((c) => c.slug));
  console.log(`Existing news posts: ${coverage.length}`);

  const { posts = [] } = await callClaude(coverage);
  console.log(`Model returned ${posts.length} candidate post(s)`);

  let written = 0;
  for (const p of posts.slice(0, MAX_POSTS)) {
    const problems = validate(p, existingSlugs);
    if (problems.length) {
      console.log(`REJECTED "${p.title ?? p.slug}": ${problems.join('; ')}`);
      continue;
    }
    await writeFile(path.join(NEWS_DIR, `${p.slug}.md`), toMarkdown(p), 'utf8');
    existingSlugs.add(p.slug);
    written++;
    console.log(`WROTE ${p.slug}.md  [${p.line}] ${p.title}`);
  }

  console.log(`\n${written} post(s) written.`);
  // Tells the workflow whether there is anything to commit.
  if (process.env.GITHUB_OUTPUT) {
    await writeFile(process.env.GITHUB_OUTPUT, `written=${written}\n`, { flag: 'a' });
  }
};

// Only run when invoked directly, so the pure functions above stay importable and testable.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
