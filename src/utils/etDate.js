/**
 * Content dates for No Fluff Cruising.
 *
 * A date-only value (YAML `2026-09-22`, or a Date that is exactly UTC midnight)
 * has no clock time on the page. Those are stored as 12:00 PM America/New_York
 * so JSON-LD and <time> never claim midnight UTC. A value that already includes
 * a time is kept as that instant and formatted in America/New_York.
 */

const ET = 'America/New_York';

export function easternOffsetMinutes(instant) {
  const tz = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    timeZoneName: 'shortOffset',
  }).formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value ?? '';
  const m = tz.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) throw new Error(`No America/New_York offset in "${tz}"`);
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
}

/** Noon in America/New_York on a YYYY-MM-DD calendar date. */
export function middayEastern(ymd) {
  const [y, mo, d] = ymd.split('-').map(Number);
  // 17:00 UTC is afternoon in both EST and EDT, and it is the same calendar day.
  // US DST switches at 2:00 AM local, so noon is never the transition hour.
  const probe = new Date(Date.UTC(y, mo - 1, d, 17, 0, 0));
  const off = easternOffsetMinutes(probe);
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0) - off * 60 * 1000);
}

function isUtcMidnight(date) {
  return date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0;
}

/**
 * @param {unknown} val
 * @returns {Date | undefined}
 */
export function normalizeContentDate(val) {
  if (val == null || val === '') return undefined;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return undefined;
    if (isUtcMidnight(val)) return middayEastern(val.toISOString().slice(0, 10));
    return val;
  }
  const s = String(val).trim().replace(/^['"]|['"]$/g, '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return middayEastern(s);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function formatEasternISO(date) {
  const instant = date instanceof Date ? date : new Date(date);
  const off = easternOffsetMinutes(instant);
  const local = new Date(instant.getTime() + off * 60 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}${sign}${p(Math.floor(abs / 60))}:${p(abs % 60)}`;
}

/** "Sep 20, 2026, 2:15 PM ET" */
export function formatEasternDisplay(date) {
  const instant = date instanceof Date ? date : new Date(date);
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(instant).replace(/[\u202f\u00a0]/g, ' ');
  return `${formatted} ET`;
}

export function easternCalendarDate(date = new Date()) {
  return formatEasternISO(date).slice(0, 10);
}
