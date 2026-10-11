import { astroRedirects, buildRedirectMap, isRedirectSource, resolvePublicPath, sitemapAllows } from './siteRedirects.js';
import { readFileSync } from 'node:fs';

let fails = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) fails++;
};

const blocked = [
  '/reviews/every-royal-caribbean-ships-cdc-health-inspection-score-ranked-2026/',
  '/reviews/royal-caribbean-crown-and-anchor-tiers-what-each-one-is-worth-in-2026/',
  '/reviews/royal-caribbean-slots-or-video-poker-which-reaches-prime-for-less/',
  '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-chang/',
  '/rss.xml',
  '/terms-of-service',
  '/privacy-policy/',
  '/sitemap.xml',
  '/news/margaritaville-at-sea/',
];
const allowed = [
  '/guides/royal-caribbean-cdc-health-inspection-scores-ranked/',
  '/guides/royal-caribbean-crown-anchor-tiers/',
  '/guides/royal-caribbean-slots-vs-video-poker/',
  '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-change/',
  '/news/brilliant-lady-cabo-ensenada-hurricane-rachel/',
  '/guides/royal-caribbean-sandals-five-things-confirmed/',
  '/terms/',
  '/news/margaritaville/',
];

for (const path of blocked) {
  check(`sitemap blocks ${path}`, sitemapAllows(`https://nofluffcruising.com${path}`) === false);
}
for (const path of allowed) {
  check(`sitemap allows ${path}`, sitemapAllows(`https://nofluffcruising.com${path}`) === true);
}

check(
  'cdc stub resolves to the guide',
  resolvePublicPath('/reviews/every-royal-caribbean-ships-cdc-health-inspection-score-ranked-2026')
    === '/guides/royal-caribbean-cdc-health-inspection-scores-ranked/',
);
check(
  'slots stub resolves to the guide',
  resolvePublicPath('/reviews/royal-caribbean-slots-or-video-poker-which-reaches-prime-for-less/')
    === '/guides/royal-caribbean-slots-vs-video-poker/',
);
check(
  'crown stub resolves to the guide',
  resolvePublicPath('/reviews/royal-caribbean-crown-and-anchor-tiers-what-each-one-is-worth-in-2026/')
    === '/guides/royal-caribbean-crown-anchor-tiers/',
);
check(
  'truncated Virgin slug resolves to the full review',
  resolvePublicPath('/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-chang/')
    === '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-change/',
);

const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
for (const rule of vercel.redirects ?? []) {
  check(`vercel source stays out of the sitemap: ${rule.source}`, isRedirectSource(rule.source));
  check(`vercel source resolves: ${rule.source}`, !isRedirectSource(resolvePublicPath(rule.source)));
}
for (const source of Object.keys(astroRedirects)) {
  check(`astro fallback stays out of the sitemap: ${source}`, isRedirectSource(source));
}

const chain = buildRedirectMap({ '/old': '/mid/', '/mid': '/final/' });
check('redirect chains resolve to the final path', resolvePublicPath('/old/', chain) === '/final/');

console.log(fails ? `\n${fails} failing` : '\nall green');
process.exit(fails ? 1 : 0);
