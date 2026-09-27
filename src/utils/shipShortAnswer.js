/**
 * 40–60 word ship-hub lead, built only from fields already on the page.
 * Later sentences are dropped when they would push the block past 60 words.
 * Nothing here is a new cruise-log fact.
 */

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sentence(text) {
  const trimmed = String(text).trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function joinList(items) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function shipShortAnswer(ship, lineName) {
  const klass = ship.shipClass;
  const lead = sentence(
    `${ship.name} is ${article(klass)} ${klass}-class ${lineName} ship${
      ship.inService ? ` that entered service in ${ship.inService}` : ''
    }`,
  );
  const specs = [];
  if (ship.guests) specs.push(`${Number(ship.guests).toLocaleString('en-US')} guests at double occupancy`);
  if (ship.maxGuests) specs.push(`up to ${Number(ship.maxGuests).toLocaleString('en-US')} guests`);
  if (ship.grossTonnage) specs.push(`${Number(ship.grossTonnage).toLocaleString('en-US')} gross tons`);
  if (ship.decks) specs.push(`${ship.decks} decks`);

  const sentences = [lead];
  if (specs.length) sentences.push(sentence(`The specs on this page list ${joinList(specs)}`));
  if (ship.status) sentences.push(sentence(`The listed status is ${ship.status}`));
  if (ship.verdict) sentences.push(sentence(ship.verdict));
  if (ship.goodAt?.length) sentences.push(sentence(`Good at: ${ship.goodAt.join('; ')}`));
  if (ship.watchFor?.length) sentences.push(sentence(`Watch for: ${ship.watchFor.join('; ')}`));
  if (ship.videoTour) {
    sentences.push(sentence(`${ship.videoTour.channel} filmed a full walkthrough titled ${ship.videoTour.title}`));
  }
  if (ship.updated) sentences.push(sentence(`Last checked ${ship.updated}`));
  if (!ship.verdict) sentences.push('A written verdict for this ship is on the way.');

  let text = sentences[0];
  for (let i = 1; i < sentences.length; i++) {
    const next = `${text} ${sentences[i]}`;
    if (wordCount(next) <= 60) text = next;
  }
  return text;
}
