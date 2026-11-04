import { mulberry32, hash2 } from './rng.js';
import { BIOMES, ENEMIES } from './enemies.js';

/*
 * Run content: ability cards (what the player fires during a battle), relics (passive run
 * modifiers), events, and the seeded map. Everything random in a run comes from the run seed
 * plus a salt, so a run can be saved and resumed between nodes.
 */

export const rngFor = (seed, ...salts) => mulberry32(salts.reduce((h, s) => hash2(h, typeof s === 'number' ? s : [...String(s)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)), seed));
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- ability cards

/**
 * cost in sparks (the meter fills over the battle). power grows with the card's level (1..3).
 * kind is how battle.js resolves it.
 */
export const ABILITIES = {
  mend: { name: 'Mend', cost: 3, icon: 'leaf', color: '#6fd08c', kind: 'healAll', power: [0.22, 0.3, 0.38], text: (p) => `Heal every hero for ${Math.round(p * 100)}% of their health.` },
  rally: { name: 'Rally Horn', cost: 3, icon: 'horn', color: '#ff9a3c', kind: 'buffAtk', power: [0.4, 0.55, 0.7], dur: 7, text: (p) => `Heroes hit ${Math.round(p * 100)}% harder for 7 s.` },
  ember: { name: 'Ember Bolt', cost: 2, icon: 'flame', color: '#ff6b3c', kind: 'bolt', power: [3.2, 4.2, 5.4], text: (p) => `A big fireball at the toughest enemy (${p.toFixed(1)}x a hero hit).` },
  ward: { name: 'Bubble Ward', cost: 3, icon: 'shield', color: '#7fc8ff', kind: 'shieldAll', power: [0.22, 0.3, 0.4], text: (p) => `Every hero gets a bubble that soaks ${Math.round(p * 100)}% of their health.` },
  starfall: { name: 'Starfall', cost: 5, icon: 'star', color: '#ffd34d', kind: 'aoe', power: [2.2, 2.9, 3.7], text: (p) => `Stars rain on every enemy (${p.toFixed(1)}x a hero hit each).` },
  frost: { name: 'Frost Snap', cost: 4, icon: 'snow', color: '#9fe3ff', kind: 'stunAll', power: [2.2, 2.9, 3.6], text: (p) => `Freeze every enemy for ${p.toFixed(1)} s.` },
  haste: { name: 'Quickstep', cost: 2, icon: 'wind', color: '#a6ff7a', kind: 'haste', power: [0.35, 0.5, 0.65], dur: 6, text: (p) => `Heroes act ${Math.round(p * 100)}% faster for 6 s.` },
  spark: { name: 'Chain Spark', cost: 3, icon: 'bolt', color: '#c9a6ff', kind: 'chain', power: [1.6, 2.1, 2.7], text: (p) => `Lightning jumps between 4 enemies (${p.toFixed(1)}x a hero hit).` },
  revive: { name: 'Second Wind', cost: 5, icon: 'heart', color: '#ff8fb1', kind: 'revive', power: [0.4, 0.6, 0.85], text: (p) => `Wake every knocked-out hero with ${Math.round(p * 100)}% health.` },
};
export const STARTING_CARDS = ['mend', 'rally', 'ember'];
export const MAX_CARDS = 5;

// ---------------------------------------------------------------- relics

export const RELICS = {
  hearth: { name: 'Warm Hearthstone', icon: 'hearth', color: '#ff9a3c', text: 'Heroes heal 10% after every battle.' },
  flint: { name: 'Whetted Flint', icon: 'flint', color: '#b3c0ce', text: 'Heroes deal 15% more damage.' },
  acorn: { name: 'Lucky Acorn', icon: 'acorn', color: '#c4823c', text: '+35% gold from battles.' },
  jar: { name: 'Spark Jar', icon: 'jar', color: '#ffd34d', text: 'Start every battle with 3 extra sparks.' },
  feather: { name: 'Swift Feather', icon: 'feather', color: '#a6ff7a', text: 'Heroes act 10% faster.' },
  bark: { name: 'Barkskin Charm', icon: 'bark', color: '#7a5434', text: 'Heroes have 15% more health.' },
  moth: { name: 'Moth Lantern', icon: 'moth', color: '#ffe7a8', text: 'The first ability in each battle is free.' },
  mirror: { name: 'Thorn Mirror', icon: 'mirror', color: '#9fe3ff', text: 'Melee attackers take 20% of the damage back.' },
  crown: { name: 'Little Crown', icon: 'crown', color: '#ffcf45', text: '+25% damage to elites and bosses.' },
  clover: { name: 'Four-leaf Clover', icon: 'clover', color: '#4fd18b', text: '+10% critical hit chance.' },
  pebble: { name: 'Echo Pebble', icon: 'pebble', color: '#c9a6ff', text: 'Abilities are 25% stronger.' },
  tea: { name: 'Chamomile Tea', icon: 'tea', color: '#f6e7a8', text: 'All healing is 25% stronger.' },
  compass: { name: 'Old Compass', icon: 'compass', color: '#d9a441', text: 'Rewards offer one more choice.' },
  emberheart: { name: 'Ember Heart', icon: 'flame', color: '#ff6b3c', text: 'Enemies start every battle burning.' },
};

// ---------------------------------------------------------------- the map

/**
 * Rows 0..ROWS-1 of choices, then the boss. Paths start from a few columns at the bottom and
 * climb one row at a time, drifting at most one column, so lines never cross much and branches
 * merge naturally. Node types by row: row 0 fights, a guaranteed rest before the boss, elites
 * from row 3, a shop and events sprinkled in.
 */
export const ROWS = 7;
const COLS = 5;

export function makeMap(seed) {
  const rng = rngFor(seed, 'map');
  const nodes = new Map(); // "r,c" -> node
  const get = (r, c) => {
    const k = `${r},${c}`;
    if (!nodes.has(k)) nodes.set(k, { id: k, r, c, next: new Set() });
    return nodes.get(k);
  };
  const starts = shuffle(rng, [0, 1, 2, 3, 4]).slice(0, 3);
  const paths = [...starts, starts[0] === 2 ? 1 : 2, Math.floor(rng() * COLS)];
  for (const c0 of paths) {
    let c = c0;
    let prev = get(0, c);
    for (let r = 1; r < ROWS; r++) {
      const options = [c - 1, c, c + 1].filter((x) => x >= 0 && x < COLS);
      // avoid crossing an existing edge from the same row
      const ok = options.filter((nc) => {
        for (const n of nodes.values()) {
          if (n.r !== r - 1) continue;
          for (const k of n.next) {
            const m = nodes.get(k);
            if ((n.c < c && m.c > nc) || (n.c > c && m.c < nc)) return false;
          }
        }
        return true;
      });
      c = pick(rng, ok.length ? ok : [c]);
      const node = get(r, c);
      prev.next.add(node.id);
      prev = node;
    }
    prev.next.add('boss');
  }
  const boss = { id: 'boss', r: ROWS, c: 2, next: new Set(), type: 'boss' };
  nodes.set('boss', boss);

  // types
  for (const n of nodes.values()) {
    if (n.type) continue;
    const r = n.r;
    let t;
    if (r === 0) t = 'fight';
    else if (r === ROWS - 1) t = 'rest';
    else {
      const roll = rng();
      if (r >= 3 && roll < 0.2) t = 'elite';
      else if (roll < 0.42) t = 'event';
      else if (roll < 0.52 && r >= 2) t = 'shop';
      else if (roll < 0.58 && r >= 2 && r <= 4) t = 'rest';
      else t = 'fight';
    }
    n.type = t;
  }
  // guarantee at least one shop and one elite somewhere in the middle
  const mids = [...nodes.values()].filter((n) => n.r >= 2 && n.r <= ROWS - 2);
  if (!mids.some((n) => n.type === 'shop')) pick(rng, mids.filter((n) => n.type !== 'elite') || mids).type = 'shop';
  const late = mids.filter((n) => n.r >= 3);
  if (!late.some((n) => n.type === 'elite') && late.length) pick(rng, late).type = 'elite';

  return {
    nodes: [...nodes.values()].map((n) => ({ id: n.id, r: n.r, c: n.c, type: n.type, next: [...n.next] })),
  };
}

export const NODE_INFO = {
  fight: { label: 'Battle', color: '#e8eef5' },
  elite: { label: 'Elite', color: '#ffb347' },
  event: { label: 'Something odd', color: '#c9a6ff' },
  shop: { label: 'Peddler', color: '#ffd34d' },
  rest: { label: 'Campfire', color: '#ff9a3c' },
  boss: { label: 'Boss', color: '#ff6b5b' },
};

// ---------------------------------------------------------------- encounters

/** Enemies for a node: { ids, level } using the biome's pools, harder the deeper you go. */
export function encounterFor(seed, biome, node, runsWon = 0) {
  const b = BIOMES[biome];
  const rng = rngFor(seed, 'enc', node.id);
  const depth = node.r;
  let ids;
  if (node.type === 'boss') ids = [b.boss];
  else if (node.type === 'elite') {
    ids = [pick(rng, b.elites)];
    const pool = pick(rng, b.pools);
    if (depth >= 4) ids.push(pool[0]);
  } else {
    const pool = pick(rng, b.pools).slice();
    const n = Math.min(pool.length, depth < 2 ? 2 : depth < 4 ? 3 : 4);
    ids = shuffle(rng, pool).slice(0, n);
    if (depth >= 5 && ids.length < 4) ids.push(pick(rng, pool));
  }
  return { ids, level: depth + runsWon * 1.5 + (BIOMES[biome].tier || 0) * 3 };
}

/** Enemy stats at a level. */
export function enemyStats(id, level) {
  const e = ENEMIES[id];
  const hpK = 2.2 * (1 + 0.13 * level);
  const atkK = 1.2 * (1 + 0.085 * level);
  return { hp: Math.round(e.hp * (e.boss ? 1.15 + 0.09 * level : hpK)), atk: Math.round(e.atk * atkK * 10) / 10 };
}

// ---------------------------------------------------------------- events

/**
 * Each choice has `do(ctx)` returning a line of outcome text. ctx gives helpers from main:
 * heal(frac), hurt(frac), gold(n), embers(n), relic(), upgradeCard(), train(), rng.
 */
export const EVENTS = [
  {
    id: 'shrine',
    title: 'A mossy shrine',
    text: 'A little stone shrine hums under a blanket of moss. Someone left a bowl for offerings.',
    choices: [
      { label: 'Kneel and rest a moment', hint: 'Heal everyone 30%', do: (c) => (c.heal(0.3), 'A warm hush settles over the party. Everyone feels better.') },
      { label: 'Leave 30 gold', hint: 'A random relic', need: (c) => c.goldNow >= 30, do: (c) => (c.gold(-30), `The moss parts. Inside: ${c.relic()}.`) },
      { label: 'Tiptoe on', hint: 'Nothing happens', do: () => 'You leave the shrine to its humming.' },
    ],
  },
  {
    id: 'pool',
    title: 'A glowing pool',
    text: 'Still water glows a soft gold. It smells of honey and thunderstorms.',
    choices: [
      { label: 'Everyone drinks', hint: '+12% max health for all, but lose 10% health now', do: (c) => (c.toughen(0.12), c.hurt(0.1), 'It fizzes. Heads swim, then everyone stands a little taller.') },
      { label: 'Fill a jar', hint: 'Relic: Spark Jar', need: (c) => !c.hasRelic('jar'), do: (c) => (c.giveRelic('jar'), 'The jar crackles happily in your pack.') },
      { label: 'Admire it and move on', do: () => 'You leave it glowing behind you.' },
    ],
  },
  {
    id: 'moth',
    title: 'A lost lantern-moth',
    text: 'A moth the size of a teacup flutters in circles, its tail glowing like a candle.',
    choices: [
      { label: 'Guide it to the surface', hint: '+10 embers', do: (c) => (c.embers(10), 'It loops once around Lumi and drifts up the shaft. Embers shimmer where it flew.') },
      { label: 'Let it ride along', hint: 'Relic: Moth Lantern', need: (c) => !c.hasRelic('moth'), do: (c) => (c.giveRelic('moth'), 'It settles in an empty lantern and glows contentedly.') },
    ],
  },
  {
    id: 'camp',
    title: 'A sleeping Grubkin camp',
    text: 'A heap of snoring Grubkin, and next to them a very shiny stash.',
    choices: [
      { label: 'Sneak in and grab it', hint: '60%: 45 gold, else everyone takes a knock', do: (c) => (c.rng() < 0.6 ? (c.gold(45), 'Not a single snore missed a beat. +45 gold.') : (c.hurt(0.15), 'A pot helmet clatters. You leave in a hurry, a bit bruised.')) },
      { label: 'Let them sleep', do: () => 'Everyone deserves a nap.' },
    ],
  },
  {
    id: 'dummy',
    title: 'An old training dummy',
    text: 'A straw dummy wearing a bucket, still standing after who knows how many years.',
    choices: [
      { label: 'Spar for a while', hint: 'A random hero gets stronger', do: (c) => `${c.train()} trains hard against the bucket.` },
      { label: 'Use it as a pillow', hint: 'Heal everyone 15%', do: (c) => (c.heal(0.15), 'Surprisingly comfy.') },
    ],
  },
  {
    id: 'tinkerer',
    title: 'A peddler with a squeaky cart',
    text: '"Tune-ups! Polish! Everything a little bit better, for a little bit of gold!"',
    choices: [
      { label: 'Tune up a card (35 gold)', hint: 'Upgrade a random ability', need: (c) => c.goldNow >= 35 && c.canUpgrade(), do: (c) => (c.gold(-35), `${c.upgradeCard()} hums with new power.`) },
      { label: 'Trade stories', hint: '+15 gold', do: (c) => (c.gold(15), 'You swap tall tales. The peddler insists on paying for the best one.') },
    ],
  },
  {
    id: 'mushrooms',
    title: 'A ring of glowcaps',
    text: 'Little mushrooms in a perfect circle, pulsing softly in time with each other.',
    choices: [
      { label: 'Step into the ring', hint: 'Upgrade a random ability, lose 12% health', need: (c) => c.canUpgrade(), do: (c) => (c.hurt(0.12), `The world spins. ${c.upgradeCard()} feels stronger.`) },
      { label: 'Pick a few for later', hint: 'Heal everyone 20%', do: (c) => (c.heal(0.2), 'Toasted glowcaps. Delicious.') },
    ],
  },
];
