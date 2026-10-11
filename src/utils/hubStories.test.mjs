import { storiesForLine, storiesForShip } from './hubStories.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

function post(id, line, ships = [], extra = {}) {
  return { id, data: { line, ships, publishDate: '2026-10-01', ...extra } };
}

const posts = [
  post('a', 'Celebrity', ['Celebrity Millennium'], { publishDate: '2026-10-01' }),
  post('b', 'Celebrity Cruises', [], { publishDate: '2026-10-02', itineraryChange: { ship: 'Celebrity Millennium' } }),
  post('c', 'Celebrity Cruises', ['Celebrity Reflection'], { publishDate: '2026-10-03' }),
  post('d', 'Royal Caribbean', ['Voyager of the Seas'], { publishDate: '2026-09-01' }),
  post('e', 'Carnival', ['Carnival Spirit'], { publishDate: '2026-10-04' }),
];

const celebrity = storiesForLine(posts, 'Celebrity Cruises');
check('line hub keeps every story for the line', celebrity.map((item) => item.id).join() === 'c,b,a');
check('line hub is not capped at a latest-N window', celebrity.length === 3);

const millennium = storiesForShip(posts, { id: 'celebrity-millennium', name: 'Celebrity Millennium' });
check('ship hub includes a ships-array match and an itinerary-change match', millennium.map((item) => item.id).join() === 'b,a');
check('ship hub does not drop older stories', millennium.length === 2);

const many = Array.from({ length: 12 }, (_, index) => post(`n${index}`, 'Virgin Voyages', ['Brilliant Lady'], { publishDate: `2026-09-${String(index + 1).padStart(2, '0')}` }));
check('ship hub returns all 12, not the latest 4', storiesForShip(many, { id: 'brilliant-lady', name: 'Brilliant Lady' }).length === 12);
check('line hub returns all 12', storiesForLine(many, 'Virgin Voyages').length === 12);

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
