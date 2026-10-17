/** Cruise Briefing popup: show rules and the public Klaviyo client subscription payload. */

export const BRIEFING_MAX_SHOWS = 3;
export const BRIEFING_DELAY_MS = 10_000;
export const KLAVIYO_REVISION = '2026-10-15';

/** Public site ID. Override with PUBLIC_KLAVIYO_COMPANY_ID. Not a private key. */
export const DEFAULT_KLAVIYO_COMPANY_ID = 'VAgS5Z';
/** "Email List". Override with PUBLIC_KLAVIYO_LIST_ID. */
export const DEFAULT_KLAVIYO_LIST_ID = 'Tx8Htx';

export const STORAGE = {
  shows: 'nfc-briefing-shows',
  subscribed: 'nfc-briefing-subscribed',
  session: 'nfc-briefing-seen',
  cookie: 'nfc_briefing',
  sessionCookie: 'nfc_briefing_seen',
};

function normalizeShows(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function isValidEmail(value) {
  const email = String(value ?? '').trim();
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function shouldShowBriefing({
  subscribed = false,
  shows = 0,
  seenThisSession = false,
  max = BRIEFING_MAX_SHOWS,
} = {}) {
  if (subscribed) return false;
  if (seenThisSession) return false;
  if (normalizeShows(shows) >= max) return false;
  return true;
}

export function parseBriefingCookie(raw) {
  const out = { shows: 0, subscribed: false };
  if (!raw || typeof raw !== 'string') return out;
  const params = new URLSearchParams(raw);
  out.shows = normalizeShows(params.get('s'));
  out.subscribed = params.get('sub') === '1';
  return out;
}

export function serializeBriefingCookie({ shows = 0, subscribed = false } = {}) {
  const params = new URLSearchParams();
  params.set('s', String(normalizeShows(shows)));
  params.set('sub', subscribed ? '1' : '0');
  return params.toString();
}

/** Prefer the higher show count and a subscribe flag from either store. */
export function mergeBriefingState(local, cookie) {
  if (!local) {
    return {
      shows: normalizeShows(cookie?.shows),
      subscribed: Boolean(cookie?.subscribed),
    };
  }
  return {
    shows: Math.max(normalizeShows(local.shows), normalizeShows(cookie?.shows)),
    subscribed: Boolean(local.subscribed) || Boolean(cookie?.subscribed),
  };
}

export function klaviyoClientSubscriptionsUrl(companyId) {
  return `https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(companyId)}`;
}

export function briefingSubscriptionBody(email, listId) {
  return {
    data: {
      type: 'subscription',
      attributes: {
        custom_source: 'Cruise Briefing popup',
        profile: {
          data: {
            type: 'profile',
            attributes: {
              email,
              subscriptions: {
                email: {
                  marketing: { consent: 'SUBSCRIBED' },
                },
              },
            },
          },
        },
      },
      relationships: {
        list: {
          data: { type: 'list', id: listId },
        },
      },
    },
  };
}

function readCookieValue(name) {
  const all = document.cookie ? document.cookie.split('; ') : [];
  for (const part of all) {
    const eq = part.indexOf('=');
    const key = eq === -1 ? part : part.slice(0, eq);
    if (key !== name) continue;
    const raw = eq === -1 ? '' : part.slice(eq + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return '';
}

function writeCookieValue(name, value, maxAge) {
  const age = maxAge == null ? '' : `; Max-Age=${maxAge}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${age}`;
}

export function loadBriefingRecord() {
  const cookie = parseBriefingCookie(readCookieValue(STORAGE.cookie));
  let local = null;
  try {
    const rawShows = localStorage.getItem(STORAGE.shows);
    local = {
      shows: rawShows == null || rawShows === '' ? 0 : Number(rawShows),
      subscribed: localStorage.getItem(STORAGE.subscribed) === '1',
    };
  } catch {
    local = null;
  }
  return mergeBriefingState(local, cookie);
}

export function saveBriefingRecord(state) {
  const shows = normalizeShows(state.shows);
  const subscribed = Boolean(state.subscribed);
  try {
    localStorage.setItem(STORAGE.shows, String(shows));
    if (subscribed) localStorage.setItem(STORAGE.subscribed, '1');
    else localStorage.removeItem(STORAGE.subscribed);
  } catch {
    /* private mode: the cookie still records it */
  }
  writeCookieValue(STORAGE.cookie, serializeBriefingCookie({ shows, subscribed }), 60 * 60 * 24 * 400);
  return { shows, subscribed };
}

export function briefingSeenThisSession() {
  try {
    if (sessionStorage.getItem(STORAGE.session) === '1') return true;
  } catch {
    /* session cookie covers the rest of the visit */
  }
  return readCookieValue(STORAGE.sessionCookie) === '1';
}

export function markBriefingSession() {
  try {
    sessionStorage.setItem(STORAGE.session, '1');
  } catch {
    /* cookie covers this browser session */
  }
  writeCookieValue(STORAGE.sessionCookie, '1');
}

export function briefingRequest({ email, companyId, listId }) {
  return {
    url: klaviyoClientSubscriptionsUrl(companyId),
    headers: {
      revision: KLAVIYO_REVISION,
      'content-type': 'application/vnd.api+json',
      accept: 'application/vnd.api+json',
    },
    body: briefingSubscriptionBody(email, listId),
  };
}
