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

## Automated cruise news

`.github/workflows/cruise-news.yml` runs twice a day, at 11:00 and 23:00 UTC
(7am and 7pm US Eastern). It calls Claude with the web search tool, which finds and
verifies cruise news across all nine lines the site covers, writes posts in the voice
defined in `VOICE.md`, and commits them to `src/content/news/`. Vercel deploys the push.

### One-time setup

1. Create an API key at console.anthropic.com and add a small amount of credit.
2. In this repo: **Settings → Secrets and variables → Actions → New repository secret**.
   Name it `ANTHROPIC_API_KEY` and paste the key. It never leaves GitHub.
3. **Actions → Cruise news → Run workflow** to test it immediately.

Optional: set a repository *variable* named `CLAUDE_MODEL` to override the default
(`claude-sonnet-5`).

### What stops a bad post going live

- `scripts/news-bot.mjs` rejects any post missing a source, carrying an invalid tier,
  using a line the site does not cover, duplicating an existing slug, or breaking the
  voice rules (em dashes, banned adverbs).
- The workflow then runs a full `astro build`. If the site does not build, nothing is
  pushed and the run fails loudly.
- On a quiet day the bot is told to return nothing. A cycle that publishes zero stories
  is a correct outcome, not a failure.

### Story images

`scripts/news-images.mjs` runs on every news cycle. For any post without a hero image it
works out what the story is actually about (matching the ship database first, then ship
naming patterns, then the cruise line), finds a photograph on Wikimedia Commons, downloads
it to `public/news/`, and writes the photographer and licence into the post so the credit
renders under the image.

Licence handling is strict by design. Only public domain, CC0, CC BY and CC BY-SA are
accepted. Non-commercial, no-derivatives and anything marked fair use or all rights
reserved are rejected, and the post keeps the house fallback image rather than using a
photo it should not. The step is `continue-on-error`, so a Commons outage never blocks a
story from publishing.

Because it runs over every post lacking an image, it backfills older stories too.

```bash
node scripts/news-images.test.mjs
```

### Changing the voice

Edit `VOICE.md`. It is passed to the model verbatim on every run, so the news follows it
without any code change.

### Testing the guardrails

```bash
node scripts/news-bot.test.mjs
```

## Automated video companion posts

Two halves.

**Drafting** happens in Cowork on an hourly schedule. It watches the Notion Video
Production Tracker for rows whose video has gone live, finds the shooting script in
Google Drive, re-checks every dated figure, writes the post, and puts it in two places:
a Google Doc in the video's asset folder for you to read, and a markdown code block on
the Notion row, which is what actually ships.

**Publishing** is `.github/workflows/publish-reviews.yml`, hourly at :25. It reads
Notion, finds rows that are Posted with a draft and no matching file on the site,
writes the markdown into `src/content/reviews/`, builds, and pushes.

### One-time setup

1. Create an internal integration at notion.so/my-integrations, name it something like
   "No Fluff Cruising site", and copy its **Internal Integration Secret**.
2. Open the Video Production Tracker in Notion, and from the **...** menu choose
   **Connections → Connect to** and pick that integration. Without this step the API
   cannot see the database.
3. In this repo: **Settings → Secrets and variables → Actions → New repository secret**,
   named `NOTION_TOKEN`.

### What stops a bad post going live

- `scripts/publish-reviews.mjs` rejects anything missing frontmatter fields or sources,
  anything still carrying the internal "DRAFT FOR APPROVAL" header or a `[VIDEO EMBED]`
  placeholder, and anything whose body is under 300 words.
- Slugs are derived from the title, and an existing file is never overwritten.
- The workflow then runs a full `astro build` and pushes nothing if it fails.

```bash
node scripts/publish-reviews.test.mjs
```
