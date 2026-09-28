import { CRUISE_NEWS_TODAY } from '../data/cruiseNewsToday.js';
import {
  SUMMARY_MIN_WORDS,
  buildNewsTodayModel,
  editionForDay,
  loadNewsPosts,
  newsTodayPublicPaths,
  wordCount,
} from './newsToday.js';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

const banned = /\b(actually|actual|exactly|simply|genuinely|quietly|honestly|basically)\b|—/;

for (const [ymd, copy] of Object.entries(CRUISE_NEWS_TODAY)) {
  const summaryWords = wordCount(copy.summary);
  const answerWords = wordCount(copy.answer);
  check(`${ymd} summary is at least ${SUMMARY_MIN_WORDS} words (${summaryWords})`, summaryWords >= SUMMARY_MIN_WORDS);
  check(`${ymd} answer is 40-60 words (${answerWords})`, answerWords >= 40 && answerWords <= 60);
  check(`${ymd} description is under 160 characters`, copy.description.length <= 160);
  check(`${ymd} copy avoids banned voice`, !banned.test(`${copy.summary}\n${copy.answer}\n${copy.description}`));
}

const posts = loadNewsPosts();
const now = new Date('2026-09-28T16:00:00-04:00');
const model = buildNewsTodayModel(posts, now);
check('build day is Sep 28 ET', model.today === '2026-09-28');
check('Sep 28 has three stories', model.edition('2026-09-28').posts.length === 3);
check('Sep 28 edition is indexable', model.edition('2026-09-28').indexable === true);
check('Sep 27 archive still has eight stories', model.edition('2026-09-27').posts.length === 8);
check('every loaded news day has an indexable summary', model.days.every((ymd) => model.edition(ymd).indexable));

const paths = newsTodayPublicPaths(posts, now);
check('live URL is in the sitemap set', paths.has('/news/today/'));
check('past archive is in the sitemap set', paths.has('/news/today/2026-09-19/'));
check('current dated URL is not duplicated in the sitemap set', !paths.has('/news/today/2026-09-28/'));
check('Sep 27 archive is in the sitemap set', paths.has('/news/today/2026-09-27/'));

const lateUtc = new Date('2026-09-27T03:30:00Z');
const grouped = buildNewsTodayModel([{
  id: 'late',
  title: 'Late',
  line: 'Royal Caribbean',
  published: lateUtc,
}], new Date('2026-09-26T22:00:00-04:00'));
check('03:30Z is still Sep 26 in Eastern time', grouped.edition('2026-09-26').posts.length === 1);
check('that instant is not filed on Sep 27', grouped.edition('2026-09-27').posts.length === 0);

const thin = editionForDay('2026-01-01', [{
  id: 'one',
  title: 'One story',
  published: new Date('2026-01-01T12:00:00-05:00'),
}], { summary: 'Too short to index.', answer: '', description: '' });
check('thin summary is noindex', thin.indexable === false);

const matthewOnly = model.days.every((ymd) => model.edition(ymd).posts.every((post) => !post.presenter || post.presenter === 'Matthew'));
check('loaded news posts on these days are Matthew', matthewOnly);

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
