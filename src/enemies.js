import { BIOME_LIST } from './biomes/index.js';

/*
 * Enemy registry. The models, stats and rooms are defined per biome in src/biomes/*.js; this
 * file merges them into flat lookups so the rest of the game can say ENEMIES[id] / BIOMES[key].
 *
 * Enemy stats are at depth 0. attack = animation ('hop', 'slash', 'cast', 'bite', 'slam', 'dive'),
 * melee = walks over to hit. Traits handled in battle.js: thorns, poison, lifesteal, burst
 * (explodes on death), mend, summon (boss calls helpers at hp thresholds), shieldSelf, stunHit,
 * burn (hits set heroes alight), enrage (once, below half health: faster and harder hitting).
 * Bosses and elites with `slamAll: <ring colour>` (and optional `slamBurn`) do a big area slam every third action.
 */

const BUILD = {};
export const ENEMIES = {};
export const BIOMES = {};

for (const m of BIOME_LIST) {
  const key = m.biome.key;
  if (BIOMES[key]) throw new Error(`Two biomes use the key ${key}`);
  BIOMES[key] = m.biome;
  for (const [id, def] of Object.entries(m.enemies)) {
    if (ENEMIES[id]) throw new Error(`Two enemies use the id ${id}`);
    if (!m.builders[id]) throw new Error(`Enemy ${id} has no model`);
    ENEMIES[id] = { ...def, biome: key };
    BUILD[id] = m.builders[id];
  }
}

export function enemySpec(id) {
  return BUILD[id]();
}

/** Enemy ids of a biome in a sensible order: regulars, elites, boss. */
export function biomeEnemies(key) {
  const ids = Object.keys(ENEMIES).filter((id) => ENEMIES[id].biome === key);
  const rank = (id) => (ENEMIES[id].boss ? 2 : ENEMIES[id].elite ? 1 : 0);
  return ids.sort((a, b) => rank(a) - rank(b));
}
