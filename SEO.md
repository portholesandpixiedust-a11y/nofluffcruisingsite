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

## DEPLOY (Matthew)

These steps are not done from the repo. Do not treat Bing as verified.

### Bing Webmaster Tools and IndexNow

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters) and add `https://nofluffcruising.com/` if it is not there yet.
2. Verify the property, or import it from Google Search Console.
3. In Bing, and again in Google Search Console, submit `https://nofluffcruising.com/sitemap-index.xml` and `https://nofluffcruising.com/news-sitemap.xml`.
4. The IndexNow key file is deployed with the site at `https://nofluffcruising.com/6d65ffe6fc6a01f5603dbd5bd7a31f66.txt`. The GitHub Action `.github/workflows/indexnow.yml` POSTs changed URLs after a push to `main`. It waits two minutes so Vercel can publish first. If the first run fails because the key file was not live yet, re-run the **IndexNow** workflow.
5. IndexNow does not replace the Bing verification click above.

### Vercel Firewall

`robots.txt` allows OAI-SearchBot, GPTBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, and Applebot-Extended. This repository has no Vercel Firewall or bot-management config, so those allows cannot be confirmed from the code. In the Vercel project, check Firewall and Bot Management and make sure those crawlers are not blocked.

### News timestamps

A `publishDate` that is only a calendar date is shown and marked up as 12:00 PM America/New_York. Posts that already had a clock time keep that time, displayed in ET. `updatedAt` (or `updatedDate`) is shown only when it differs from the published time.

### Duplicate URLs

Real 301s for the old CDC, slots, Crown & Anchor, and truncated Virgin Voyages URLs are in `vercel.json`. The duplicate sources are unpublished so they drop out of the sitemap.

## Notes

- Contact for site ownership questions: portholesandpixiedust@gmail.com
- Do not submit individual `sitemap-0.xml` alone if the index is available; submit the index URL.
- After large content drops, re-request indexing on the hub pages (`/guides/`, `/reviews/`, `/ships/`) rather than every URL at once.
