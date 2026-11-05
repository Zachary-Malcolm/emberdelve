import { STARTERS } from './heroes.js';
import { randomSeed } from './rng.js';

// Everything that lasts between delves lives in localStorage under one key.
const KEY = 'vdelve.save.v1';

export function fresh() {
  return {
    v: 1,
    seed: randomSeed(), // the home island's shape and nature
    embers: 0,
    built: { gate: 1, storehouse: 1 }, // building id -> level
    roster: STARTERS.slice(),
    party: STARTERS.slice(),
    gear: {}, // hero id -> 0..2
    items: [], // trinkets in the Storehouse (see items.js)
    equip: {}, // hero id -> trinket uid
    biomes: ['hollow'],
    stats: { runs: 0, wins: 0, best: 0, embersEarned: 0, bossesBeaten: 0 },
    run: null, // the delve in progress (see main.js startRun)
    sky: { live: true, hour: 12, weather: 'auto', cur: 'fair', until: 0 },
    music: true,
    muted: false,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    const f = fresh();
    return { ...f, ...s, built: { ...f.built, ...(s.built || {}) }, stats: { ...f.stats, ...(s.stats || {}) } };
  } catch {
    return fresh();
  }
}

export function store(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode or full: the game still works, it just won't remember */
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
