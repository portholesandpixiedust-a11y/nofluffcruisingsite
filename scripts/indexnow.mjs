#!/usr/bin/env node
/**
 * IndexNow ping for URLs changed on this push.
 *
 * The key file in public/ is public on purpose. IndexNow verifies the host by
 * fetching https://nofluffcruising.com/{key}.txt. This does not verify the site
 * in Bing Webmaster Tools. Matthew still has to do that, then import from
 * Google Search Console. See SEO.md.
 *
 * The action waits before posting so the Vercel deploy can publish the key file
 * and the changed pages. Re-run the workflow if the first attempt races the deploy.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'nofluffcruising.com';
const ORIGIN = `https://${HOST}`;
const DRY = process.argv.includes('--dry-run') || process.env.INDEXNOW_DRY_RUN === '1';

function readKey() {
  const files = fs.readdirSync('public').filter((f) => /^[a-f0-9]{8,128}\.txt$/.test(f));
  for (const file of files) {
    const key = file.slice(0, -4);
    const body = fs.readFileSync(path.join('public', file), 'utf8').trim();
    if (body === key) return key;
  }
  throw new Error('No IndexNow key file in public/. Expected public/{key}.txt containing the key.');
}

function contentSlugs(folder) {
  const dir = path.join('src/content', folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
}

function shipUrls() {
  const ships = JSON.parse(fs.readFileSync('src/data/ships.json', 'utf8'));
  return ships.map((s) => `${ORIGIN}/ships/${s.line}/${s.id}/`);
}

function lineUrls() {
  const lines = JSON.parse(fs.readFileSync('src/data/lines.json', 'utf8'));
  return lines.map((l) => `${ORIGIN}/lines/${l.id}/`);
}

function pageFileUrl(file) {
  const rel = file.replace(/^src\/pages\//, '').replace(/\.astro$/, '');
  if (rel.includes('[')) return null;
  if (rel === 'index') return `${ORIGIN}/`;
  const cleaned = rel.replace(/\/index$/, '');
  return `${ORIGIN}/${cleaned}/`;
}

/** Map a git path to the public URLs that file can change. */
export function urlsForFile(file) {
  const urls = new Set();
  let m;
  if ((m = file.match(/^src\/content\/(news|guides|reviews)\/(.+)\.md$/))) {
    urls.add(`${ORIGIN}/${m[1]}/${m[2]}/`);
    urls.add(`${ORIGIN}/${m[1]}/`);
  } else if (file === 'src/data/ships.json') {
    for (const url of shipUrls()) urls.add(url);
    urls.add(`${ORIGIN}/ships/`);
  } else if (file === 'src/data/lines.json') {
    for (const url of lineUrls()) urls.add(url);
    urls.add(`${ORIGIN}/ships/`);
  } else if (file === 'src/layouts/Article.astro' || file === 'src/pages/news/[...slug].astro' || file === 'src/pages/guides/[...slug].astro' || file === 'src/pages/reviews/[...slug].astro') {
    for (const folder of ['news', 'guides', 'reviews']) {
      for (const slug of contentSlugs(folder)) urls.add(`${ORIGIN}/${folder}/${slug}/`);
      urls.add(`${ORIGIN}/${folder}/`);
    }
  } else if (file === 'src/pages/ships/[line]/[ship].astro' || file === 'src/pages/ships/index.astro') {
    for (const url of shipUrls()) urls.add(url);
    urls.add(`${ORIGIN}/ships/`);
  } else if (file === 'src/pages/lines/[line].astro') {
    for (const url of lineUrls()) urls.add(url);
  } else if (file.startsWith('src/pages/') && file.endsWith('.astro')) {
    const url = pageFileUrl(file);
    if (url) urls.add(url);
  } else if (file === 'src/layouts/Base.astro' || file === 'src/components/Header.astro' || file === 'src/components/Footer.astro' || file === 'public/robots.txt') {
    urls.add(`${ORIGIN}/`);
    urls.add(`${ORIGIN}/news/`);
    urls.add(`${ORIGIN}/guides/`);
    urls.add(`${ORIGIN}/reviews/`);
    urls.add(`${ORIGIN}/ships/`);
  }
  return [...urls];
}

export function changedFiles() {
  const zero = /^0+$/;
  let before = process.env.BEFORE || '';
  const after = process.env.AFTER || 'HEAD';
  if (!before || zero.test(before)) before = 'HEAD~1';
  const out = execSync(`git diff --name-only --diff-filter=ACMR ${before} ${after}`, { encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const files = changedFiles();
  const urls = [...new Set(files.flatMap(urlsForFile))].slice(0, 10000);
  if (urls.length === 0) {
    console.log('IndexNow: no URLs to submit.');
    return;
  }
  const key = readKey();
  const body = {
    host: HOST,
    key,
    keyLocation: `${ORIGIN}/${key}.txt`,
    urlList: urls,
  };
  console.log(`IndexNow: ${urls.length} URL(s)`);
  for (const url of urls) console.log(`  ${url}`);
  if (DRY) {
    console.log('IndexNow dry run. Nothing posted.');
    return;
  }
  const delay = Number(process.env.INDEXNOW_DELAY_SECONDS ?? 120);
  if (delay > 0) {
    console.log(`Waiting ${delay}s so the deploy can publish the key file and pages.`);
    await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`IndexNow ${res.status} ${text.slice(0, 300)}`);
  if (res.status !== 200 && res.status !== 202) {
    process.exit(1);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
