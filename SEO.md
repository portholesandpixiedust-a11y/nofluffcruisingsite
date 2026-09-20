# Search Console setup (No Fluff Cruising)

Use this checklist after the legal and footer pages ship.

## Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console) and add the property.
2. Prefer a **Domain** property for `nofluffcruising.com` (DNS TXT verification via your registrar or DNS host). If DNS is blocked, use a **URL prefix** property for `https://nofluffcruising.com/` and verify with the HTML file, meta tag, or Google Analytics/Tag method you already control.
3. After verification, open **Sitemaps** and submit:

   `https://nofluffcruising.com/sitemap-index.xml`

   Astro’s `@astrojs/sitemap` integration emits `sitemap-index.xml` (and `sitemap-0.xml`). The site redirect maps legacy `/sitemap.xml` to the index.
4. In **URL Inspection**, request indexing for:
   - `https://nofluffcruising.com/`
   - Top guides and reviews you care about first (home “Latest guides” and “Ship reviews” cards are a good start)
   - New legal pages once live: `/terms/`, `/privacy/`, `/disclosure/`, `/contact/`
5. Recheck Coverage / Pages reports after a few days. Fix soft 404s and redirect chains before asking for more indexing.

## Bing Webmaster Tools (optional)

1. Add `https://nofluffcruising.com/` in [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Import from Google Search Console if offered, or verify with the Bing meta/XML/DNS method.
3. Submit the same sitemap: `https://nofluffcruising.com/sitemap-index.xml`.

## Notes

- Contact for site ownership questions: portholesandpixiedust@gmail.com
- Do not submit individual `sitemap-0.xml` alone if the index is available; submit the index URL.
- After large content drops, re-request indexing on the hub pages (`/guides/`, `/reviews/`, `/ships/`) rather than every URL at once.
