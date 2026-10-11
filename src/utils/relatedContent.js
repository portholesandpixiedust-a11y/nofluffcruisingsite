import { byPublishDate } from './byPublishDate.js';
import { canonicalLine } from './newsLines.js';

function norm(value) {
  return String(value ?? '').trim().toLowerCase();
}

/** Ships from frontmatter, plus the itinerary-change ship when the array was left empty. */
export function storyShipTokens(data = {}) {
  const tokens = [...(data.ships ?? [])];
  if (data.itineraryChange?.ship) tokens.push(data.itineraryChange.ship);
  return tokens.filter(Boolean);
}

function overlap(left, right) {
  const set = new Set((left ?? []).map(norm).filter(Boolean));
  if (set.size === 0) return 0;
  return (right ?? []).filter((item) => set.has(norm(item))).length;
}

/**
 * Up to 4 related entries. Same line first (shared ship, then shared topic, then newest).
 * Open slots are filled with other-line entries that share a topic or a ship.
 */
export function relatedEntries(current, pool, { limit = 4 } = {}) {
  const data = current.data ?? current;
  const line = norm(canonicalLine(data.line));
  const ships = storyShipTokens(data);
  const topics = data.topics ?? [];

  const rows = pool
    .filter((item) => item.id !== current.id)
    .map((item) => {
      const itemData = item.data ?? item;
      const itemLine = norm(canonicalLine(itemData.line));
      return {
        item,
        sameLine: Boolean(line) && itemLine === line,
        shipHits: overlap(ships, storyShipTokens(itemData)),
        topicHits: overlap(topics, itemData.topics),
      };
    })
    .filter((row) => row.sameLine || row.shipHits > 0 || row.topicHits > 0);

  const sameLine = rows
    .filter((row) => row.sameLine)
    .sort((a, b) => b.shipHits - a.shipHits || b.topicHits - a.topicHits || byPublishDate(a.item, b.item));
  const rest = rows
    .filter((row) => !row.sameLine)
    .sort((a, b) => b.topicHits - a.topicHits || b.shipHits - a.shipHits || byPublishDate(a.item, b.item));

  return [...sameLine, ...rest].slice(0, limit).map((row) => row.item);
}
