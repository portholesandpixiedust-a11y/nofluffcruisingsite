# No Fluff Cruising

Companion site for youtube.com/@nofluffcruising. Astro, static output, no client-side
content rendering, so AI crawlers that do not run JavaScript still get the whole article.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
```

## Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel, New Project, import that repo.
3. Vercel detects Astro. Framework preset: Astro. Build command `npm run build`, output `dist`.
4. Add the domain `nofluffcruising.com` under Project Settings, Domains, and point the
   registrar's nameservers or A/CNAME records where Vercel tells you to.

**Important:** leave Vercel's AI-crawler blocking OFF (Project Settings, Firewall).
Blocking it silently defeats the entire AEO strategy and nothing in analytics will tell you.

## Adding content

- Video companion post: a markdown file in `src/content/posts/`. See the Crown & Anchor
  post for the frontmatter shape, including the `sources` array that renders the citation block.
- Guide: `src/content/guides/` (supports a `faq` array which emits FAQPage schema).
- News: `src/content/news/`.
- Ships: one object in `src/data/ships.json` generates a full ship page.
- Cruise lines: `src/data/lines.json`.

## Structure

```
src/content.config.ts   collection schemas, including the sources/tier shape
src/data/               ship + line database, drives all /ships/ pages
src/styles/brand.css    brand tokens sampled from the channel banner and avatar
src/layouts/Article.astro   emits Article + VideoObject + FAQPage JSON-LD
src/components/Sources.astro    the tiered citation block
public/robots.txt       AI crawlers explicitly allowed
public/llms.txt         site map written for language models
```

## Brand

Navy `#0A2260`, safety orange `#EE5A28`, ocean `#0A5D81`.
Anton for display, Source Serif 4 for body, Archivo for UI.
