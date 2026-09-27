import { formatEasternDisplay, formatEasternISO, middayEastern, normalizeContentDate } from './etDate.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

check('September date-only is noon EDT', formatEasternISO(middayEastern('2026-09-22')) === '2026-09-22T12:00:00-04:00');
check('January date-only is noon EST', formatEasternISO(middayEastern('2026-01-15')) === '2026-01-15T12:00:00-05:00');
check('offset timestamp is preserved in ET', formatEasternISO(normalizeContentDate('2026-09-27T09:10:00-04:00')) === '2026-09-27T09:10:00-04:00');
check('UTC midnight Date is treated as date-only noon ET', formatEasternISO(normalizeContentDate(new Date('2026-09-22T00:00:00.000Z'))) === '2026-09-22T12:00:00-04:00');
check('display includes clock and ET', formatEasternDisplay(normalizeContentDate('2026-09-20T14:15:00-04:00')) === 'Sep 20, 2026, 2:15 PM ET');

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
