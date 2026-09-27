import hubs from '../data/ship-hubs.json' with { type: 'json' };

export function shipHub(id) {
  return hubs[id] ?? null;
}

/** Rebuilt hubs drop Product schema. Other ship pages keep the existing type. */
export function shipPageIncludesProduct(id) {
  return !hubs[id];
}

export const rebuiltShipIds = Object.keys(hubs);
