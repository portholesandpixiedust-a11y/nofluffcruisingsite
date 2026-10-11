import { byPublishDate } from './byPublishDate.js';
import { canonicalLine } from './newsLines.js';
import { storyShipTokens } from './relatedContent.js';

export function mentionsShip(list, ship) {
  return (list ?? []).some((token) => token === ship.id || token === ship.name);
}

/** Every story for a line hub, newest first. Not capped. */
export function storiesForLine(posts, lineName) {
  const name = canonicalLine(lineName);
  return posts.filter((post) => canonicalLine(post.data.line) === name).sort(byPublishDate);
}

/** Every story that names this ship, including itinerary-change records. Not capped. */
export function storiesForShip(posts, ship) {
  return posts
    .filter((post) => mentionsShip(storyShipTokens(post.data), ship))
    .sort(byPublishDate);
}
