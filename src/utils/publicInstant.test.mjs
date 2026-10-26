import { formatEasternISO } from './etDate.js';
import { commitInstant, publicInstant } from './publicInstant.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

const checkedAt = new Date('2026-10-26T09:51:00-04:00');
const commit = new Date('2026-10-26T09:07:43-04:00');

const harmony = publicInstant('2026-10-26T11:05:00-04:00', { commit, now: checkedAt });
const virtuosa = publicInstant('2026-10-26T10:20:00-04:00', { commit, now: checkedAt });
check(
  '11:05 stamp uses the commit, not a future clock',
  formatEasternISO(harmony) === '2026-10-26T09:07:43-04:00',
);
check(
  '10:20 stamp uses the same commit',
  formatEasternISO(virtuosa) === '2026-10-26T09:07:43-04:00',
);

const noCommit = publicInstant('2026-10-26T11:05:00-04:00', { now: checkedAt });
check(
  'future stamp without a commit clamps to build time in Eastern',
  formatEasternISO(noCommit) === '2026-10-26T09:51:00-04:00',
);

const winterNow = new Date('2026-01-15T10:00:00-05:00');
const winter = publicInstant('2026-01-15T15:00:00-05:00', { now: winterNow });
check(
  'January clamp keeps the EST offset',
  formatEasternISO(winter) === '2026-01-15T10:00:00-05:00',
);

const past = publicInstant('2026-10-19T10:20:00-04:00', {
  commit: new Date('2026-10-19T08:00:00-04:00'),
  now: checkedAt,
});
check('a past clock time stays put', formatEasternISO(past) === '2026-10-19T10:20:00-04:00');

const dateOnly = publicInstant('2026-10-26', {
  commit: new Date('2026-10-25T22:00:00-04:00'),
  now: checkedAt,
});
check(
  'a future noon date-only value clamps to build time and stays on that calendar day',
  formatEasternISO(dateOnly) === '2026-10-26T09:51:00-04:00',
);

const futureCommit = publicInstant('2026-10-26T11:05:00-04:00', {
  commit: new Date('2026-10-26T12:00:00-04:00'),
  now: checkedAt,
});
check(
  'a commit that is itself in the future does not win',
  formatEasternISO(futureCommit) === '2026-10-26T09:51:00-04:00',
);

const harmonyCommit = commitInstant('src/content/news/harmony-of-the-seas-nassau-cococay-order-october-2026.md');
check(
  'harmony file commit is 09:07 ET',
  harmonyCommit && formatEasternISO(harmonyCommit) === '2026-10-26T09:07:43-04:00',
);

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
