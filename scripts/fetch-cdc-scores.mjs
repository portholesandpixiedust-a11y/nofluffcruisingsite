#!/usr/bin/env node
/**
 * Pull the CDC Vessel Sanitation Program Green Sheet and attach each ship's
 * cruise line from the CDC Inspection Query Tool (most recent score, all lines).
 *
 * Writes:
 *   src/data/cdc-scores.json
 *   src/data/cdc-scores-source.json
 *
 * Fails closed. If a Green Sheet ship cannot be matched to the same ship, date,
 * and score in the CDC search results, nothing is written.
 *
 * Usage: node scripts/fetch-cdc-scores.mjs
 */

import { writeFile } from 'node:fs/promises';
import { easternCalendarDate } from '../src/utils/etDate.js';

const GREEN_URL = 'https://wwwn.cdc.gov/InspectionQueryTool/InspectionGreenSheetRpt.aspx';
const SEARCH_URL = 'https://wwwn.cdc.gov/InspectionQueryTool/InspectionSearch.aspx';
const RESULTS_URL = 'https://wwwn.cdc.gov/InspectionQueryTool/InspectionResults.aspx';
const UA = 'NoFluffCruising/1.0 (+https://nofluffcruising.com; CDC score database refresh)';

const GREEN_ROW = /href=InspectionDetailReport\.aspx\?ColI=[^>]+>\s*([^<]+)<\/a>/gi;
const RESULT_ROW = /<td\b[^>]*>\s*(?:<font\b[^>]*>)?\s*([^<]+?)\s*(?:<\/font>)?\s*<\/td><td\b[^>]*>\s*(?:<font\b[^>]*>)?\s*([^<]+?)\s*(?:<\/font>)?\s*<\/td><td\b[^>]*>\s*(?:<font\b[^>]*>)?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:<\/font>)?\s*<\/td><td\b[^>]*>\s*(?:<font\b[^>]*>)?\s*(\d{1,3})\s*(?:<\/font>)?\s*<\/td>/gi;
const PAGER = /__doPostBack\(&#39;(ctl00\$ContentPlaceHolder1\$dgMasterList\$ctl\d+\$ctl\d+)&#39;,&#39;&#39;\)/g;

function matches(html, pattern) {
  return html.matchAll(new RegExp(pattern.source, pattern.flags));
}

export function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toIsoDate(value) {
  const m = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) throw new Error(`Unrecognised CDC date "${value}"`);
  const month = m[1].padStart(2, '0');
  const day = m[2].padStart(2, '0');
  const iso = `${m[3]}-${month}-${day}`;
  const check = new Date(`${iso}T12:00:00Z`);
  if (check.getUTCFullYear() !== Number(m[3]) || check.getUTCMonth() + 1 !== Number(month) || check.getUTCDate() !== Number(day)) {
    throw new Error(`Invalid CDC date "${value}"`);
  }
  return iso;
}

export function slugify(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseGreenSheet(html) {
  const rows = [];
  const seen = new Set();
  for (const match of matches(html, GREEN_ROW)) {
    const ship = decodeEntities(match[1]);
    const tail = html.slice(match.index, match.index + 700).replace(/<[^>]+>/g, ' ');
    const dated = tail.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,3})/);
    if (!dated) throw new Error(`Green Sheet row for ${ship} has no date and score`);
    const inspectionDate = toIsoDate(dated[1]);
    const score = Number(dated[2]);
    if (!ship) throw new Error('Green Sheet row is missing a ship name');
    if (!Number.isInteger(score) || score < 0 || score > 100) throw new Error(`Bad score for ${ship}: ${match[3]}`);
    const key = ship.toLowerCase();
    if (seen.has(key)) throw new Error(`Green Sheet lists ${ship} twice`);
    seen.add(key);
    rows.push({ ship, inspectionDate, score });
  }
  if (rows.length < 50) throw new Error(`Green Sheet parse returned ${rows.length} ships. The page shape may have changed.`);
  return rows;
}

export function parseSearchResults(html) {
  const rows = [];
  for (const match of matches(html, RESULT_ROW)) {
    rows.push({
      ship: decodeEntities(match[1]),
      line: decodeEntities(match[2]),
      inspectionDate: toIsoDate(match[3]),
      score: Number(match[4]),
    });
  }
  return rows;
}

function hidden(html, id) {
  const m = html.match(new RegExp(`id="${id}" value="([^"]*)"`));
  if (!m) throw new Error(`CDC form is missing ${id}`);
  return decodeEntities(m[1]);
}

function cookieJar() {
  const jar = new Map();
  return {
    store(response) {
      const list = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
      for (const cookie of list) {
        const pair = cookie.split(';')[0];
        const eq = pair.indexOf('=');
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    },
    header() {
      return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
    },
  };
}

async function cdcFetch(url, { jar, method = 'GET', body, referer } = {}) {
  const headers = { 'user-agent': UA, accept: 'text/html' };
  const cookie = jar?.header();
  if (cookie) headers.cookie = cookie;
  if (body) {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    if (referer) headers.referer = referer;
  }
  const response = await fetch(url, { method, headers, body, redirect: 'follow' });
  jar?.store(response);
  if (!response.ok) throw new Error(`CDC ${response.status} for ${url}`);
  return response.text();
}

function formBody(fields) {
  return new URLSearchParams(fields).toString();
}

async function allLineMostRecent(jar) {
  const searchHtml = await cdcFetch(SEARCH_URL, { jar });
  const first = await cdcFetch(SEARCH_URL, {
    jar,
    method: 'POST',
    referer: SEARCH_URL,
    body: formBody([
      ['__EVENTTARGET', ''],
      ['__EVENTARGUMENT', ''],
      ['__VIEWSTATE', hidden(searchHtml, '__VIEWSTATE')],
      ['__VIEWSTATEGENERATOR', hidden(searchHtml, '__VIEWSTATEGENERATOR')],
      ['__VIEWSTATEENCRYPTED', ''],
      ['__EVENTVALIDATION', hidden(searchHtml, '__EVENTVALIDATION')],
      ['ctl00$ContentPlaceHolder1$rb_Cruiseline_Vessel', 'rb_Cruiseline'],
      ['ctl00$ContentPlaceHolder1$lbox_CruiselineName', '0'],
      ['ctl00$ContentPlaceHolder1$rb_InspectionDateCriteria', 'rb_MostRecentDate'],
      ['ctl00$ContentPlaceHolder1$txtFromSearchDate', ''],
      ['ctl00$ContentPlaceHolder1$txtToSearchDate', ''],
      ['ctl00$ContentPlaceHolder1$rb_InspectionScoreCriteria', 'rb_InspectionScoreAll'],
      ['ctl00$ContentPlaceHolder1$cmdSearch', 'Search'],
    ]),
  });

  const byShip = new Map();
  const absorb = (html) => {
    for (const row of parseSearchResults(html)) {
      const key = row.ship.toLowerCase();
      const prev = byShip.get(key);
      if (!prev) {
        byShip.set(key, row);
        continue;
      }
      const same = prev.line === row.line && prev.inspectionDate === row.inspectionDate && prev.score === row.score;
      if (!same) throw new Error(`CDC search disagreed with itself on ${row.ship}`);
    }
  };
  absorb(first);

  let page = first;
  const seenTargets = new Set();
  for (let hop = 0; hop < 8; hop++) {
    const targets = [...matches(page, PAGER)].map((m) => m[1]).filter((target) => !seenTargets.has(target));
    if (!targets.length) break;
    let advanced = false;
    for (const target of targets) {
      seenTargets.add(target);
      const next = await cdcFetch(RESULTS_URL, {
        jar,
        method: 'POST',
        referer: RESULTS_URL,
        body: formBody([
          ['__EVENTTARGET', target],
          ['__EVENTARGUMENT', ''],
          ['__VIEWSTATE', hidden(page, '__VIEWSTATE')],
          ['__VIEWSTATEGENERATOR', hidden(page, '__VIEWSTATEGENERATOR')],
          ['__VIEWSTATEENCRYPTED', ''],
          ['__EVENTVALIDATION', hidden(page, '__EVENTVALIDATION')],
        ]),
      });
      const before = byShip.size;
      absorb(next);
      if (byShip.size > before) {
        page = next;
        advanced = true;
        break;
      }
    }
    if (!advanced) break;
  }
  return byShip;
}

export function joinScores(greenRows, lineByShip) {
  const ships = [];
  const missing = [];
  for (const row of greenRows) {
    const line = lineByShip.get(row.ship.toLowerCase());
    if (!line || line.inspectionDate !== row.inspectionDate || line.score !== row.score) {
      missing.push(row.ship);
      continue;
    }
    ships.push({
      id: slugify(row.ship),
      ship: row.ship,
      line: line.line,
      score: row.score,
      inspectionDate: row.inspectionDate,
    });
  }
  if (missing.length) {
    throw new Error(`Could not match ${missing.length} Green Sheet ships to a CDC line, date, and score: ${missing.slice(0, 8).join(', ')}`);
  }
  const ids = new Set();
  for (const ship of ships) {
    if (ids.has(ship.id)) throw new Error(`Duplicate id ${ship.id}`);
    ids.add(ship.id);
  }
  ships.sort((a, b) => a.score - b.score || a.ship.localeCompare(b.ship));
  return ships;
}

async function main() {
  const jar = cookieJar();
  const [greenHtml, lineByShip] = await Promise.all([
    cdcFetch(GREEN_URL, { jar: cookieJar() }),
    allLineMostRecent(jar),
  ]);
  const greenRows = parseGreenSheet(greenHtml);
  const ships = joinScores(greenRows, lineByShip);
  const retrieved = easternCalendarDate();
  const source = {
    program: 'CDC Vessel Sanitation Program',
    report: 'Green Sheet Report',
    reportUrl: GREEN_URL,
    lineLookup: 'CDC Inspection Query Tool, most recent inspection, all cruise lines',
    lineLookupUrl: SEARCH_URL,
    retrieved,
    satisfactoryAt: 86,
    shipCount: ships.length,
    note: 'Each row is the most recent Green Sheet score for a ship in VSP jurisdiction on the retrieval date. The cruise line is the CDC search label for that same ship, date, and score. Do not type scores by hand. Refresh this file with node scripts/fetch-cdc-scores.mjs.',
  };
  await writeFile('src/data/cdc-scores.json', `${JSON.stringify(ships, null, 2)}\n`);
  await writeFile('src/data/cdc-scores-source.json', `${JSON.stringify(source, null, 2)}\n`);
  const below = ships.filter((ship) => ship.score < source.satisfactoryAt).length;
  console.log(`Wrote ${ships.length} ships. ${below} below ${source.satisfactoryAt}. Retrieved ${retrieved}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
