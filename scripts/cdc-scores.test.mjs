import { decodeEntities, joinScores, parseGreenSheet, parseSearchResults, slugify, toIsoDate } from './fetch-cdc-scores.mjs';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

const fillers = Array.from({ length: 50 }, (_, i) => {
  const name = `Fixture Ship ${i}`;
  return `<a href=InspectionDetailReport.aspx?ColI=f${i}> ${name} </a></td><td>01/02/2026</td><td>90</td>`;
}).join('\n');
const green = `
<a href=InspectionDetailReport.aspx?ColI=abc> Adventure of the Seas </a></td><td>06/02/2026</td><td>95</td>
<a href=InspectionDetailReport.aspx?ColI=def> Norwegian Dawn </a></td><td>03/29/2026</td><td>84</td>
${fillers}
`;
const results = `
<td align="left">Adventure of the Seas</td><td align="left">Royal Caribbean International</td><td align="center">6/2/2026</td><td align="center">95</td>
<td align="left">Norwegian Dawn</td><td align="left">Norwegian Cruise Lines</td><td align="center">3/29/2026</td><td align="center">84</td>
${Array.from({ length: 50 }, (_, i) => `<td align="left">Fixture Ship ${i}</td><td align="left">Fixture Line</td><td align="center">1/2/2026</td><td align="center">90</td>`).join('\n')}
`;

const greenRows = parseGreenSheet(green);
check('green sheet parses ship, date, score', greenRows.some((row) => row.ship === 'Norwegian Dawn' && row.score === 84 && row.inspectionDate === '2026-03-29'));
check('iso date pads month and day', toIsoDate('6/2/2026') === '2026-06-02');
check('entities decode', decodeEntities('P&amp;O Cruises') === 'P&O Cruises');
check('slug is stable', slugify('Wonder Of The Seas') === 'wonder-of-the-seas');

const lines = new Map(parseSearchResults(results).map((row) => [row.ship.toLowerCase(), row]));
let joined = null;
let joinError = '';
try { joined = joinScores(greenRows, lines); } catch (err) { joinError = err.message; }
check('join keeps CDC line and rejects nothing when dates match', joined?.find((row) => row.ship === 'Norwegian Dawn')?.line === 'Norwegian Cruise Lines');

lines.set('norwegian dawn', { ship: 'Norwegian Dawn', line: 'Norwegian Cruise Lines', inspectionDate: '2026-01-01', score: 84 });
let rejected = false;
try { joinScores(greenRows, lines); } catch { rejected = true; }
check('join rejects a date that does not match the Green Sheet', rejected && !joinError);

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
