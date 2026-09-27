# Industry news

## How news is published

Weekday industry news is handled by Grok Bot (research plus pull requests) or by a manual pull request into `src/content/news/`.

`.github/workflows/industry-news.yml` is retired. It used to run `scripts/news-bot.mjs` (Claude / Anthropic) on weekdays and from **Actions → Industry news → Run workflow**. That Action must not be used. It has no schedule and no manual dispatch. `scripts/news-bot.mjs` is unused by CI.

## Preferred sources

Cruise line press rooms, Royal Caribbean Blog, The Points Guy, Cruise Critic, Seatrade Cruise News, Cruise News Radio, Cruise Industry News, Travel Weekly cruise desk, Cruise Mapper when useful.

## Reviewing an old hold

Older conflict drafts may still sit in `src/content/news-holds/`. They are not published.

1. Open the markdown under `src/content/news-holds/`.
2. Resolve the conflict in the copy and sources.
3. Move the file into `src/content/news/` and remove `status` / `conflictNote` frontmatter fields.
4. Commit, or open a pull request with the approved hold.
