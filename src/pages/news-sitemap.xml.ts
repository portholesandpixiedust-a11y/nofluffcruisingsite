import { getCollection } from 'astro:content';
import { formatEasternISO } from '../utils/etDate.js';

export const prerender = true;

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Google News sitemap. Built at deploy time: only /news/ published in the last
 * 48 hours, newest first, capped at 1,000. A later news-bot commit rebuilds it.
 */
export async function GET(context) {
  const site = (context.site?.href ?? 'https://nofluffcruising.com/').replace(/\/$/, '');
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const posts = (await getCollection('news'))
    .map((entry) => {
      const published = entry.data.publishedAt ?? entry.data.publishDate;
      return { entry, published };
    })
    .filter((row) => row.published && new Date(row.published).getTime() >= cutoff)
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
    .slice(0, 1000);

  const urls = posts.map(({ entry, published }) => `  <url>
    <loc>${esc(`${site}/news/${entry.id}/`)}</loc>
    <news:news>
      <news:publication>
        <news:name>No Fluff Cruising</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${esc(formatEasternISO(published))}</news:publication_date>
      <news:title>${esc(entry.data.title)}</news:title>
    </news:news>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
