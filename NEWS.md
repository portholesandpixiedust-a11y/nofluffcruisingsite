# Industry news

## How news is published

Weekday industry news is handled by Grok Bot (research plus pull requests) or by a manual pull request into `src/content/news/`.

`.github/workflows/industry-news.yml` is retired. It used to run `scripts/news-bot.mjs` (Claude / Anthropic) on weekdays and from **Actions → Industry news → Run workflow**. That Action must not be used. It has no schedule and no manual dispatch. `scripts/news-bot.mjs` is unused by CI.

## Preferred sources

Cruise line press rooms, Royal Caribbean Blog, The Points Guy, Cruise Critic, Seatrade Cruise News, Cruise News Radio, Cruise Industry News, Travel Weekly cruise desk, Cruise Mapper when useful.

## Itinerary change tracker

Posts that change a sailing someone could already hold (a port skip, a delay, or a swap) should include an `itineraryChange` block. `/trackers/itinerary-changes/` lists those posts. The block is optional. New itinerary releases, ship news, and policy notes leave it off.

`ship`, `sailing`, and `changed` must repeat facts already in the post and its sources. `changed` leads with what the booked passenger loses or gains. `kinds` is one or more of `port-skip`, `delay`, `swap`.

Add the block in the news pull request. The field shape is on the tracker page.

## Reviewing an old hold

Older conflict drafts may still sit in `src/content/news-holds/`. They are not published.

1. Open the markdown under `src/content/news-holds/`.
2. Resolve the conflict in the copy and sources.
3. Move the file into `src/content/news/` and remove `status` / `conflictNote` frontmatter fields.
4. Commit, or open a pull request with the approved hold.
