import { execFileSync } from 'node:child_process';
import { formatEasternISO, middayEastern, normalizeContentDate } from './etDate.js';

/**
 * Publish instants for sitemaps and JSON-LD.
 *
 * A clock time that is still in the future is not a publish time. Use the
 * commit that added the file when that commit is already in the past, and
 * otherwise clamp to build time (`now`). Date-only values stay at noon
 * Eastern unless that noon has not happened yet, in which case they clamp
 * to build time and keep the Eastern offset.
 */

function asDate(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date-only frontmatter, a UTC-midnight Date, or the noon-ET instant that stands in for one. */
export function isDateOnlyValue(value) {
  if (value == null || value === '') return false;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim().replace(/^['"]|['"]$/g, ''))) {
    return true;
  }
  const stated = value instanceof Date && !Number.isNaN(value.getTime())
    ? value
    : normalizeContentDate(value);
  if (!(stated instanceof Date) || Number.isNaN(stated.getTime())) return false;
  if (
    value instanceof Date
    && stated.getUTCHours() === 0
    && stated.getUTCMinutes() === 0
    && stated.getUTCSeconds() === 0
    && stated.getUTCMilliseconds() === 0
  ) {
    return true;
  }
  const ymd = formatEasternISO(stated).slice(0, 10);
  return stated.getTime() === middayEastern(ymd).getTime();
}

/**
 * @param {unknown} value
 * @param {{ commit?: Date | string | number | null, now?: Date | string | number }} [options]
 * @returns {Date | undefined}
 */
export function publicInstant(value, { commit = null, now = new Date() } = {}) {
  const stated = normalizeContentDate(value);
  if (!stated) return undefined;
  const nowDate = asDate(now) ?? new Date();
  let instant = stated;
  if (instant.getTime() > nowDate.getTime() && !isDateOnlyValue(value)) {
    const commitDate = asDate(commit);
    if (commitDate && commitDate.getTime() <= nowDate.getTime() && commitDate.getTime() < instant.getTime()) {
      instant = commitDate;
    }
  }
  if (instant.getTime() > nowDate.getTime()) return new Date(nowDate.getTime());
  return instant;
}

let commitCache;
function loadCommitInstants(root) {
  const map = new Map();
  try {
    const out = execFileSync(
      'git',
      ['log', '--reverse', '--pretty=format:%cI', '--name-only', '--', 'src/content'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 },
    );
    let current = null;
    for (const line of out.split(/\r?\n/)) {
      if (!line.trim()) continue;
      if (/^\d{4}-\d{2}-\d{2}T/.test(line)) {
        current = asDate(line.trim());
        continue;
      }
      const rel = line.trim();
      if (current && !map.has(rel)) map.set(rel, current);
    }
  } catch {
    // A build without git history still clamps anything dated after `now`.
  }
  return map;
}

export function contentCommitInstants(root = process.cwd()) {
  if (!commitCache || commitCache.root !== root) {
    commitCache = { root, map: loadCommitInstants(root) };
  }
  return commitCache.map;
}

export function commitInstant(relativePath, root = process.cwd()) {
  if (!relativePath) return null;
  const rel = String(relativePath).replace(/\\/g, '/').replace(/^\.\//, '');
  const fromContent = rel.includes('src/content/') ? rel.slice(rel.indexOf('src/content/')) : rel;
  return contentCommitInstants(root).get(fromContent) ?? null;
}

export function entryPublishInstant(value, relativePath, now = new Date()) {
  return publicInstant(value, { commit: commitInstant(relativePath), now });
}
