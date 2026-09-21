/**
 * Reverse-chronological sort for content collections.
 * Primary: publishDate (newest first). ISO datetimes sort correctly via Date.
 * Secondary: id descending when timestamps tie, so same-day date-only posts
 * stay in a deterministic order instead of filesystem/collection noise.
 */
export function byPublishDate(a, b) {
  const diff = new Date(b.data.publishDate) - new Date(a.data.publishDate);
  if (diff !== 0) return diff;
  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}
