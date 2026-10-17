import {
  BRIEFING_MAX_SHOWS,
  DEFAULT_KLAVIYO_COMPANY_ID,
  DEFAULT_KLAVIYO_LIST_ID,
  KLAVIYO_REVISION,
  briefingRequest,
  isValidEmail,
  mergeBriefingState,
  parseBriefingCookie,
  serializeBriefingCookie,
  shouldShowBriefing,
} from './briefingPopup.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

check('shows on a fresh visitor', shouldShowBriefing({ shows: 0 }));
check('shows on the third slot', shouldShowBriefing({ shows: 2 }));
check('hides at the cap', !shouldShowBriefing({ shows: BRIEFING_MAX_SHOWS }));
check('hides after subscribe', !shouldShowBriefing({ shows: 0, subscribed: true }));
check('hides when already seen this session', !shouldShowBriefing({ shows: 0, seenThisSession: true }));
check('a junk count counts as zero shows', shouldShowBriefing({ shows: Number.NaN }));
check('valid email', isValidEmail('  sailor@example.com '));
check('rejects a bare domain', !isValidEmail('sailor@example'));
check('rejects empty', !isValidEmail('  '));

const cookie = serializeBriefingCookie({ shows: 2, subscribed: true });
const parsed = parseBriefingCookie(cookie);
check('cookie round trip', parsed.shows === 2 && parsed.subscribed === true);
check('empty cookie', parseBriefingCookie('').shows === 0 && parseBriefingCookie('').subscribed === false);

const merged = mergeBriefingState({ shows: 1, subscribed: false }, { shows: 3, subscribed: true });
check('merge keeps the higher count and any subscribe', merged.shows === 3 && merged.subscribed === true);
const cookieOnly = mergeBriefingState(null, { shows: 2, subscribed: false });
check('merge falls back to the cookie', cookieOnly.shows === 2 && cookieOnly.subscribed === false);

const req = briefingRequest({
  email: 'sailor@example.com',
  companyId: DEFAULT_KLAVIYO_COMPANY_ID,
  listId: DEFAULT_KLAVIYO_LIST_ID,
});
check('client url uses the public site id', req.url === 'https://a.klaviyo.com/client/subscriptions/?company_id=VAgS5Z');
check('revision header', req.headers.revision === KLAVIYO_REVISION && KLAVIYO_REVISION === '2026-10-15');
check('list id', req.body.data.relationships.list.data.id === 'Tx8Htx');
check(
  'email marketing consent',
  req.body.data.attributes.profile.data.attributes.subscriptions.email.marketing.consent === 'SUBSCRIBED',
);
check('email is on the profile', req.body.data.attributes.profile.data.attributes.email === 'sailor@example.com');
check('company id is encoded', briefingRequest({
  email: 'a@b.co',
  companyId: 'A B',
  listId: 'Tx8Htx',
}).url.endsWith('company_id=A%20B'));

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
