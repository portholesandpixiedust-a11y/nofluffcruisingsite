import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * HTML fallbacks for hosts that do not read vercel.json.
 * vercel.json is the HTTP 301 list. Both lists feed the sitemap filter.
 */
export const astroRedirects = {
  '/sitemap.xml': '/sitemap-index.xml',
  '/terms-of-service': '/terms/',
  '/privacy-policy': '/privacy/',
  '/news/margaritaville-at-sea': '/news/margaritaville/',
};

/** Paths that are real responses but should not be submitted as indexable pages. */
const SITEMAP_EXCLUDES = ['/rss.xml'];

function pathnameOf(input) {
  if (input == null || input === '') return '/';
  if (/^https?:\/\//i.test(input)) return new URL(input).pathname || '/';
  const path = input.startsWith('/') ? input : `/${input}`;
  return path.split(/[?#]/)[0] || '/';
}

/** Bare path and trailing-slash form, so /foo and /foo/ share one redirect. */
export function pathKeys(input) {
  const pathname = pathnameOf(input);
  if (pathname === '/') return ['/'];
  const bare = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return [bare, `${bare}/`];
}

export function loadVercelRedirects(file = join(root, 'vercel.json')) {
  const vercel = JSON.parse(readFileSync(file, 'utf8'));
  const map = {};
  for (const rule of vercel.redirects ?? []) {
    if (!rule?.source || !rule?.destination) continue;
    map[rule.source] = rule.destination;
  }
  return map;
}

export function buildRedirectMap(vercelRedirects = loadVercelRedirects()) {
  const map = new Map();
  const add = (source, destination) => {
    for (const key of pathKeys(source)) map.set(key, destination);
  };
  for (const [source, destination] of Object.entries(astroRedirects)) add(source, destination);
  for (const [source, destination] of Object.entries(vercelRedirects)) add(source, destination);
  return map;
}

let cachedMap;
export function getRedirectMap() {
  if (!cachedMap) cachedMap = buildRedirectMap();
  return cachedMap;
}

export function isRedirectSource(input, map = getRedirectMap()) {
  return pathKeys(input).some((key) => map.has(key));
}

/** Follow the shared redirect list to the final public path. */
export function resolvePublicPath(input, map = getRedirectMap()) {
  let current = pathnameOf(input);
  const seen = new Set();
  for (let hop = 0; hop < 5; hop++) {
    const key = pathKeys(current).find((candidate) => map.has(candidate));
    if (!key || seen.has(key)) break;
    seen.add(key);
    current = pathnameOf(map.get(key));
  }
  return current;
}

export function canonicalLinks(entries, toPath, map = getRedirectMap()) {
  const seen = new Set();
  const links = [];
  for (const entry of entries) {
    const href = resolvePublicPath(toPath(entry), map);
    if (seen.has(href)) continue;
    seen.add(href);
    links.push({ entry, href });
  }
  return links;
}

export function sitemapAllows(page, map = getRedirectMap()) {
  const pathname = pathnameOf(page);
  if (pathKeys(pathname).some((key) => SITEMAP_EXCLUDES.includes(key))) return false;
  if (isRedirectSource(pathname, map)) return false;
  return true;
}
