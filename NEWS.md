# Cruise news automation

## What runs

`.github/workflows/cruise-news.yml` runs on weekdays at 8am, 11am, 2pm, and 5pm US Eastern (cron is UTC). It also supports **Actions → Cruise news → Run workflow**.

`scripts/news-bot.mjs` searches preferred industry sources, writes longer rewrites in `VOICE.md`, validates sourcing, and:

- publishes clean stories to `src/content/news/`
- parks **conflict** drafts in `src/content/news-holds/` (outlets disagree on a load-bearing fact)

Target: at least three published stories per day when the industry actually produced that much. Quiet shortfalls are allowed; filler is not.

## Preferred sources

Cruise line press rooms, Royal Caribbean Blog, The Points Guy, Cruise Critic, Seatrade Cruise News, Cruise News Radio, Cruise Industry News, Travel Weekly cruise desk, Cruise Mapper when useful.

## Secrets

Repository secret `ANTHROPIC_API_KEY` is required. Optional variable `CLAUDE_MODEL`.

## Reviewing a hold

1. Open the markdown under `src/content/news-holds/`.
2. Resolve the conflict in the copy and sources.
3. Move the file into `src/content/news/` and remove `status` / `conflictNote` frontmatter fields.
4. Commit, or ask the site assistant to publish the approved hold.
