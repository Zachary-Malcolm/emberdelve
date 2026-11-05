// Trinkets: loot from chests (elites and bosses). One trinket per hero, kept in the Storehouse at camp.
//
// Balance rule: a trinket is always smaller than one Forge tier (+15% health AND power). The best
// mythic adds about +14% spread over two stats plus one small effect, so items are a nice nudge,
// never a reason the party wins.

import { pick } from './rng.js';

export const RARITIES = [
  { id: 'common', name: 'Common', color: '#b9b2a4', budget: 0.04, stats: 1, melt: 2 },
  { id: 'uncommon', name: 'Uncommon', color: '#5fc27e', budget: 0.06, stats: 1, melt: 4 },
  { id: 'rare', name: 'Rare', color: '#4f9cf0', budget: 0.08, stats: 2, melt: 8 },
  { id: 'epic', name: 'Epic', color: '#a873f0', budget: 0.1, stats: 2, melt: 14 },
  { id: 'legendary', name: 'Legendary', color: '#f0a03a', budget: 0.11, stats: 2, melt: 24, effect: true },
  { id: 'mythic', name: 'Mythic', color: '#f0567f', budget: 0.12, stats: 2, melt: 40, effect: true },
];
export const RARITY = Object.fromEntries(RARITIES.map((r, i) => [r.id, { ...r, rank: i }]));

/** Stats an item can roll. Values are fractions (0.05 = 5%). */
export const STATS = {
  atk: { name: 'power', words: ['Keen', 'Bright', 'Fierce'], fmt: (v) => `+${pct(v)}% power` },
  hp: { name: 'health', words: ['Sturdy', 'Mossy', 'Hearty'], fmt: (v) => `+${pct(v)}% health` },
  spd: { name: 'speed', words: ['Swift', 'Breezy', 'Nimble'], fmt: (v) => `+${pct(v)}% attack speed` },
  crit: { name: 'crit', words: ['Lucky', 'Sly', 'Glinting'], fmt: (v) => `+${pct(v)}% critical chance` },
  guard: { name: 'guard', words: ['Stout', 'Snug', 'Steady'], fmt: (v) => `${pct(v)}% less damage taken` },
};
const pct = (v) => Math.round(v * 100);

export const BASES = {
  ring: { name: 'Ring', icon: 'ring' },
  amulet: { name: 'Amulet', icon: 'amulet' },
  charm: { name: 'Charm', icon: 'charm' },
  gem: { name: 'Gem', icon: 'gem' },
};

/** Small effects for legendary trinkets (handled in battle.js). */
export const EFFECTS = {
  shield: { title: 'of the Warm Wall', text: 'Starts each battle with a shield of 12% health.' },
  regen: { title: 'of Slow Moss', text: 'Heals 1.5% health every 2 s.' },
  thorns: { title: 'of Brambles', text: 'Melee attackers take 15% of the damage back.' },
  leech: { title: 'of the Thirsty Moon', text: 'Heals for 6% of the damage it deals.' },
  spark: { title: 'of First Sparks', text: '+1 spark at the start of each battle.' },
  firstcrit: { title: 'of the Opening Strike', text: 'Its first hit in each battle is a critical hit.' },
};

/** Mythic trinkets are unique, named pieces with a signature effect. */
export const MYTHICS = {
  phoenix: { name: 'Phoenix Plume', icon: 'feather', text: 'Once per battle, gets back up at 25% health.' },
  echo: { name: 'Echo Bell', icon: 'bell', text: '12% chance to act again right away.' },
  sparkheart: { name: 'Sparkheart', icon: 'heart', text: 'Critical hits give +1 spark (at most once every 3 s).' },
};

// chance of each rarity, per chest kind (deeper biomes shift a little weight upwards)
const ODDS = {
  elite: [50, 30, 14, 5, 1, 0],
  boss: [18, 30, 28, 15, 7, 2],
};

function rollRarity(rng, kind, tier, floor = 0) {
  const w = ODDS[kind].slice();
  // each biome tier (up to 4) nudges a fifth of each rarity's weight one step up
  for (let t = 0; t < Math.min(tier, 4); t++)
    for (let i = w.length - 2; i >= 0; i--) {
      const move = w[i] * 0.2;
      w[i] -= move;
      w[i + 1] += move;
    }
  for (let i = 0; i < floor; i++) w[i] = 0;
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return RARITIES[i].id;
  return RARITIES[w.length - 1].id;
}

export function makeItem(rng, rarityId) {
  const r = RARITY[rarityId];
  const keys = Object.keys(STATS);
  const first = pick(rng, keys);
  const picked = [first];
  if (r.stats > 1) picked.push(pick(rng, keys.filter((k) => k !== first)));
  const each = r.stats > 1 ? r.budget * 0.58 : r.budget; // two stats share the budget (a bit over half each)
  const stats = {};
  for (const k of picked) stats[k] = Math.round(each * (k === 'guard' ? 0.8 : 1) * 100) / 100;
  const item = { uid: `${Date.now().toString(36)}${Math.floor(rng() * 1e6).toString(36)}`, rarity: rarityId, stats };
  if (rarityId === 'mythic') {
    item.effect = pick(rng, Object.keys(MYTHICS));
    item.base = 'mythic';
    item.name = MYTHICS[item.effect].name;
  } else {
    item.base = pick(rng, Object.keys(BASES));
    const word = pick(rng, STATS[first].words);
    if (r.effect) item.effect = pick(rng, Object.keys(EFFECTS));
    item.name = item.effect ? `${BASES[item.base].name} ${EFFECTS[item.effect].title}` : `${word} ${BASES[item.base].name}`;
  }
  return item;
}

/** A chest's contents: elites give one trinket, bosses two (the second is at least rare). */
export function chestLoot(rng, kind, tier = 0) {
  const out = [makeItem(rng, rollRarity(rng, kind, tier))];
  if (kind === 'boss') out.push(makeItem(rng, rollRarity(rng, kind, tier, 2)));
  return out.sort((a, b) => RARITY[b.rarity].rank - RARITY[a.rarity].rank);
}

export function itemIcon(item) {
  return item.base === 'mythic' ? MYTHICS[item.effect].icon : BASES[item.base].icon;
}

export function effectText(item) {
  if (!item.effect) return '';
  return item.rarity === 'mythic' ? MYTHICS[item.effect].text : EFFECTS[item.effect].text;
}

export function statLines(item) {
  return Object.entries(item.stats).map(([k, v]) => STATS[k].fmt(v));
}

/** Storehouse size by level. */
export const STASH = [0, 12, 24];
