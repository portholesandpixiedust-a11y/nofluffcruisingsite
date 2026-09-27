import fs from 'node:fs';
import path from 'node:path';
import { CRUISE_NEWS_TODAY } from '../data/cruiseNewsToday.js';
import { easternCalendarDate, normalizeContentDate } from './etDate.js';

export const SUMMARY_MIN_WORDS = 150;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function wordCount(text) {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

export function formatDayHeading(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatDayShort(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

function sortNewestFirst(posts) {
  return [...posts].sort((a, b) => {
    const diff = b.published - a.published;
    if (diff !== 0) return diff;
    if (a.id === b.id) return 0;
    return a.id < b.id ? 1 : -1;
  });
}

export function groupPostsByDay(posts) {
  const map = new Map();
  for (const post of posts) {
    const ymd = easternCalendarDate(post.published);
    if (!map.has(ymd)) map.set(ymd, []);
    map.get(ymd).push(post);
  }
  for (const [ymd, list] of map) map.set(ymd, sortNewestFirst(list));
  return map;
}

export function editionForDay(ymd, postsOnDay, copy = CRUISE_NEWS_TODAY[ymd]) {
  const posts = sortNewestFirst(postsOnDay ?? []);
  const summary = copy?.summary?.trim() ?? '';
  const words = wordCount(summary);
  const indexable = posts.length > 0 && words >= SUMMARY_MIN_WORDS;
  return {
    ymd,
    posts,
    summary,
    answer: copy?.answer?.trim() ?? '',
    description: copy?.description?.trim() ?? '',
    words,
    indexable,
    published: posts.length ? posts[posts.length - 1].published : null,
    modified: posts.length ? posts[0].published : null,
  };
}

/**
 * @param {{ id: string, title: string, line?: string, presenter?: string, published: Date }[]} posts
 * @param {Date} [now]
 */
export function buildNewsTodayModel(posts, now = new Date()) {
  const today = easternCalendarDate(now);
  const grouped = groupPostsByDay(posts);
  const days = [...grouped.keys()].filter((ymd) => ymd <= today).sort();
  const edition = (ymd) => editionForDay(ymd, grouped.get(ymd) ?? []);
  const latest = [...days].reverse().find((ymd) => edition(ymd).posts.length > 0) ?? null;
  return { today, days, edition, latest };
}

/** Sitemap paths. The current day's dated URL canonicalizes to /news/today/. */
export function newsTodayPublicPaths(posts, now = new Date()) {
  const model = buildNewsTodayModel(posts, now);
  const paths = new Set();
  if (model.edition(model.today).indexable) paths.add('/news/today/');
  for (const ymd of model.days) {
    if (ymd === model.today) continue;
    if (model.edition(ymd).indexable) paths.add(`/news/today/${ymd}/`);
  }
  return paths;
}

export function newsTodayLastmods(posts, now = new Date()) {
  const model = buildNewsTodayModel(posts, now);
  const map = new Map();
  const live = model.edition(model.today);
  const liveDate = live.modified ?? (model.latest ? model.edition(model.latest).modified : null);
  if (liveDate) map.set('/news/today/', liveDate);
  for (const ymd of model.days) {
    const modified = model.edition(ymd).modified;
    if (modified) map.set(`/news/today/${ymd}/`, modified);
  }
  return map;
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? match[1] : '';
}

function grab(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
  if (!match) return undefined;
  return match[1].replace(/^['"]|['"]$/g, '');
}

export function loadNewsPosts(root = process.cwd()) {
  const dir = path.join(root, 'src/content/news');
  if (!fs.existsSync(dir)) return [];
  const posts = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const block = frontmatter(path.join(dir, file));
    const published = normalizeContentDate(grab(block, 'publishedAt') || grab(block, 'publishDate'));
    if (!published) continue;
    posts.push({
      id: file.slice(0, -3),
      title: grab(block, 'title') || file.slice(0, -3),
      line: grab(block, 'line') || '',
      presenter: grab(block, 'presenter') || 'Matthew',
      published,
    });
  }
  return posts;
}
