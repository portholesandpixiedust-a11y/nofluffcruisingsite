/** Tag that places a news post on the Hurricane Rachel cruise tracker. */
export const HURRICANE_RACHEL_TAG = 'hurricane-rachel';

export const HURRICANE_RACHEL_TRACKER_PATH = '/trackers/hurricane-rachel/';

/**
 * True when YAML frontmatter has `tags: [hurricane-rachel]` or a list item.
 * Used by the sitemap lastmod map, which reads files rather than the collection.
 * @param {string} block
 * @param {string} tag
 */
export function frontmatterHasTag(block, tag) {
  const inline = block.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inline) {
    return inline[1].split(',').some((part) => part.trim().replace(/^['"]|['"]$/g, '') === tag);
  }
  const list = block.match(/^tags:\s*\n((?:[ \t]+-[^\n]*\n?)*)/m);
  if (!list) return false;
  return list[1].split('\n').some((line) => {
    const item = line.match(/^\s+-\s+(.+?)\s*$/);
    return Boolean(item && item[1].replace(/^['"]|['"]$/g, '') === tag);
  });
}
