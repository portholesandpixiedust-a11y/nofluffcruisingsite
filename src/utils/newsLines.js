/**
 * Cruise lines the news desk covers.
 * `name` matches news frontmatter `line` and lines.json `name`.
 * `id` matches lines.json `id` (the /lines/{id}/ page).
 * `hub` is the /news/{hub}/ slug.
 * Margaritaville's hub is `margaritaville`. Its line page stays `margaritaville-at-sea`.
 */
export const NEWS_LINES = [
  { name: 'Royal Caribbean', id: 'royal-caribbean', hub: 'royal-caribbean' },
  { name: 'Carnival Cruise Line', id: 'carnival', hub: 'carnival' },
  { name: 'Norwegian Cruise Line', id: 'norwegian', hub: 'norwegian' },
  { name: 'MSC Cruises', id: 'msc', hub: 'msc' },
  { name: 'Disney Cruise Line', id: 'disney', hub: 'disney' },
  { name: 'Celebrity Cruises', id: 'celebrity', hub: 'celebrity' },
  { name: 'Virgin Voyages', id: 'virgin-voyages', hub: 'virgin-voyages' },
  { name: 'Princess Cruises', id: 'princess', hub: 'princess' },
  { name: 'Margaritaville at Sea', id: 'margaritaville-at-sea', hub: 'margaritaville' },
  { name: 'Azamara', id: 'azamara', hub: 'azamara' },
  { name: 'Cunard', id: 'cunard', hub: 'cunard' },
  { name: 'Holland America', id: 'holland-america', hub: 'holland-america' },
  { name: 'Silversea', id: 'silversea', hub: 'silversea' },
];

// Short labels already used in older posts. Stored line names follow lines.json.
const LINE_ALIASES = {
  Carnival: 'Carnival Cruise Line',
  Norwegian: 'Norwegian Cruise Line',
  MSC: 'MSC Cruises',
  Disney: 'Disney Cruise Line',
  Celebrity: 'Celebrity Cruises',
  Princess: 'Princess Cruises',
};

export function canonicalLine(name) {
  if (!name) return '';
  return LINE_ALIASES[name] || name;
}

export function newsLineByName(name) {
  const canonical = canonicalLine(name);
  return NEWS_LINES.find((row) => row.name === canonical) ?? null;
}

export function newsHubSlug(name) {
  return newsLineByName(name)?.hub ?? null;
}

/** Older lines.json id for Margaritaville. The hub itself is /news/margaritaville/. */
export const NEWS_HUB_ALIASES = {
  'margaritaville-at-sea': 'margaritaville',
};
