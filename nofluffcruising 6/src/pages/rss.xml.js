import { getCollection } from 'astro:content';

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(context) {
  const site = context.site?.href ?? 'https://nofluffcruising.com/';
  const all = [];
  for (const [coll, route] of [['reviews', 'reviews'], ['guides', 'guides'], ['news', 'news']]) {
    for (const e of await getCollection(coll)) all.push({ e, route });
  }
  all.sort((a, b) => new Date(b.e.data.publishDate) - new Date(a.e.data.publishDate));
  const items = all.map(({ e, route }) => `    <item>
      <title>${esc(e.data.title)}</title>
      <link>${site}${route}/${e.id}/</link>
      <guid>${site}${route}/${e.id}/</guid>
      <pubDate>${new Date(e.data.publishDate).toUTCString()}</pubDate>
      <description>${esc(e.data.description)}</description>
    </item>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>No Fluff Cruising</title>
    <link>${site}</link>
    <description>Expert cruise tips, ship reviews and ship tours. Every claim named and dated.</description>
    <language>en-us</language>
${items}
</channel></rss>`, { headers: { 'Content-Type': 'application/xml' } });
}
