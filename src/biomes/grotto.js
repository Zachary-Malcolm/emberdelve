import { box, part, humanBones } from '../chars.js';
import { pick } from '../rng.js';

// Crystal Grotto: slate blue-greys, glowing cyan / violet crystal, bone white.

const CRYSTAL = '#7fd6e8';
const VIOLET = '#b88cff';
const SLATE = '#5a6478';

function shardling() {
  const p = [
    part('root', 'rock', 'rock', SLATE, [0, 4, 0], [9, 5, 9]),
    part('root', 'spire', 'magic', CRYSTAL, [0, 8.6, -0.5], [3.2, 6, 3.2]),
    part('root', 'spire', 'magic', '#a6ecff', [-2.6, 7.2, 1.6], [2.2, 4, 2.2], [0.2, 0, 0.35]),
    part('root', 'spire', 'magic', CRYSTAL, [2.8, 7.4, -1.6], [2.4, 4.4, 2.4], [-0.2, 0, -0.35]),
    box('head', 'rock', '#6b768c', [0, 4, 4.6], [5.4, 3.2, 2.4]),
    box('eyes', 'magic', '#e8fbff', [-1.4, 4.4, 5.85], [1.1, 1.1, 0.3]),
    box('eyes', 'magic', '#e8fbff', [1.4, 4.4, 5.85], [1.1, 1.1, 0.3]),
  ];
  const bones = { root: { p: [0, 0, 0] }, head: { parent: 'root', p: [0, 4, 3.5] }, eyes: { parent: 'head', p: [0, 4.4, 5.8] } };
  [[2.6, 0], [-2.6, 2]].forEach(([z, i]) => {
    for (const sx of [-1, 1]) {
      const n = 'leg' + (i + (sx > 0 ? 1 : 0));
      bones[n] = { parent: 'root', p: [sx * 3.6, 3.2, z] };
      p.push(box(n, 'rock', '#4a5366', [sx * 4.9, 1.8, z], [1.2, 3.2, 1.2], [0, 0, sx * 0.3]));
    }
  });
  return { bones, parts: p, anim: 'bug' };
}

function glimmerbat() {
  const fur = '#4a3f6b';
  const wing = '#6b5a9a';
  const p = [
    box('root', 'fur', fur, [0, 6, 0], [7, 6.4, 6]),
    box('root', 'magic', '#c9a6ff', [0, 5, 3.05], [3.6, 3.2, 0.4]),
    box('eyes', 'magic', '#ffe066', [-1.6, 7.6, 3.1], [1.5, 1.3, 0.4]),
    box('eyes', 'magic', '#ffe066', [1.6, 7.6, 3.1], [1.5, 1.3, 0.4]),
    box('root', 'bone', '#ffffff', [-0.8, 4.4, 3.1], [0.5, 0.9, 0.3]),
    box('root', 'bone', '#ffffff', [0.8, 4.4, 3.1], [0.5, 0.9, 0.3]),
    box('root', 'fur', '#3a3156', [-1.4, 2.4, 0], [1, 1.4, 1]),
    box('root', 'fur', '#3a3156', [1.4, 2.4, 0], [1, 1.4, 1]),
  ];
  for (const sx of [-1, 1]) {
    p.push(box('root', 'fur', fur, [sx * 2.3, 10.4, 0], [2.2, 3.2, 1.4], [0, 0, sx * -0.25]));
    p.push(box('root', 'cloth', '#d98cc8', [sx * 2.3, 10.2, 0.6], [1, 2, 0.4], [0, 0, sx * -0.25]));
    const w = sx < 0 ? 'wingL' : 'wingR';
    p.push(box(w, 'cloth', wing, [sx * 7.4, 6.4, 0], [8, 0.6, 5.4]));
    p.push(box(w, 'cloth', wing, [sx * 9.6, 5.6, 0], [3.6, 0.6, 3.6]));
    p.push(box(w, 'fur', '#3a3156', [sx * 7, 6.9, 0], [8.4, 0.9, 0.9]));
    p.push(part(w, 'spire', 'magic', CRYSTAL, [sx * 11.4, 7.2, 0], [1.2, 2.4, 1.2], [0, 0, sx * -0.6]));
  }
  return {
    bones: { root: { p: [0, 0, 0] }, eyes: { parent: 'root', p: [0, 7.6, 3.1] }, wingL: { parent: 'root', p: [-3.4, 6.6, 0] }, wingR: { parent: 'root', p: [3.4, 6.6, 0] }, head: { parent: 'root', p: [0, 6, 0] } },
    parts: p,
    anim: 'flyer',
    hover: 12,
  };
}

function rattler() {
  const bone = '#ece4cf';
  const boneD = '#cfc4a8';
  const p = [];
  for (const [leg, x] of [['legL', -2], ['legR', 2]]) {
    p.push(box(leg, 'bone', bone, [x, 3.2, 0], [1.6, 4.2, 1.6]));
    p.push(box(leg, 'bone', boneD, [x, 0.7, 0.6], [2.6, 1.4, 3.4]));
  }
  p.push(box('torso', 'bone', boneD, [0, 5.4, 0], [6, 1.6, 3.6]));
  p.push(box('torso', 'cloth', '#5a6b8c', [0, 6.3, 0], [6.8, 1.4, 4.2]));
  p.push(box('torso', 'cloth', '#4a5a78', [2.2, 4.6, 2.2], [2, 3, 0.4]));
  p.push(box('torso', 'bone', bone, [0, 9, -0.6], [1.6, 7, 1.6]));
  for (const [y, w, d] of [[11, 7.4, 4.2], [9.4, 6.8, 3.8], [7.9, 6, 3.4]]) p.push(box('torso', 'bone', bone, [0, y, 0.4], [w, 0.9, d]));
  for (const [arm, x] of [['armL', -4.6], ['armR', 4.6]]) {
    p.push(box(arm, 'bone', bone, [x, 9, 0], [1.4, 4.6, 1.4]));
    p.push(box(arm, 'bone', boneD, [x, 6.2, 0.2], [2, 2, 2]));
  }
  p.push(box('head', 'bone', bone, [0, 16.2, 0.2], [8.6, 7.4, 7.6]));
  p.push(box('head', 'bone', boneD, [0, 12.7, 1.0], [6.2, 1.6, 5.4]));
  p.push(box('head', 'bone', '#fffaf0', [0, 13.6, 4.1], [4.8, 0.8, 0.3]));
  for (const sx of [-1, 1]) p.push(box('head', 'eye', '#1a1620', [sx * 2, 16, 4.05], [2.6, 2.6, 0.4]));
  p.push(box('head', 'eye', '#1a1620', [0, 14.5, 4.05], [1, 1.2, 0.3]));
  p.push(box('eyes', 'magic', '#7fe0ff', [-2, 15.8, 4.35], [1, 1, 0.3]));
  p.push(box('eyes', 'magic', '#7fe0ff', [2, 15.8, 4.35], [1, 1, 0.3]));
  // dented miner's helmet with a little lamp
  p.push(box('hat', 'metal', '#6d7480', [0, 20.6, 0], [9.4, 2.4, 8.8]));
  p.push(box('hat', 'metal', '#5a606b', [0, 19.4, 0.8], [10, 0.6, 10]));
  p.push(box('hat', 'magic', '#ffd27a', [0, 20.4, 4.8], [2.2, 2, 1.2]));
  p.push(box('hat', 'metal', '#d9a441', [0, 20.4, 4.3], [2.8, 2.6, 0.6]));
  // pickaxe
  p.push(box('handR', 'wood', '#8a5a33', [5.3, 9.4, 0.4], [1, 8.4, 1]));
  p.push(box('handR', 'metal', '#9aa2ad', [5.3, 13.4, 0.4], [1.2, 1.4, 8]));
  p.push(box('handR', 'metal', '#b8c0ca', [5.3, 12.8, 4.4], [1, 1.2, 1.4]));
  p.push(box('handR', 'metal', '#b8c0ca', [5.3, 12.8, -3.6], [1, 1.2, 1.4]));
  return {
    bones: humanBones({ armL: { p: [-4.6, 11, 0] }, armR: { p: [4.6, 11, 0] }, handR: { p: [4.6, 6, 0.4], rest: [0.4, 0, 0] }, hat: { p: [0, 20, 0] } }),
    parts: p.map((q) => (q.bone === 'handR' ? { ...q, o: [q.o[0] - 0.7, q.o[1], q.o[2]] } : q)),
    anim: 'human',
  };
}

function geode() {
  const rock = '#6e6a86';
  const rockD = '#58556e';
  const p = [];
  for (const [leg, x] of [['legL', -2.6], ['legR', 2.6]]) {
    p.push(box(leg, 'rock', rock, [x, 3, 0], [4.2, 5.6, 4.4]));
    p.push(box(leg, 'rock', rockD, [x, 0.8, 0.6], [4.8, 1.6, 5.4]));
  }
  p.push(box('torso', 'rock', rock, [0, 10.4, 0], [11.4, 9, 7.4]));
  p.push(box('torso', 'rock', rockD, [0, 9.8, 3.75], [6.6, 5.6, 0.4]));
  p.push(box('torso', 'magic', '#e07fff', [0, 9.8, 3.9], [5, 4, 0.4]));
  for (const sx of [-1, 1]) {
    p.push(part('torso', 'spire', 'magic', CRYSTAL, [sx * 5.4, 17.2, 0], [2.8, 5, 2.8], [0, 0, sx * -0.3]));
    p.push(part('torso', 'spire', 'magic', VIOLET, [sx * 3.4, 16.4, -2], [2.2, 3.6, 2.2], [-0.3, 0, sx * -0.2]));
  }
  p.push(box('head', 'rock', rock, [0, 16.8, 1.4], [6.2, 4.6, 5.4]));
  p.push(box('head', 'rock', rockD, [0, 18.7, 3.9], [6.6, 1, 1.4]));
  p.push(box('eyes', 'magic', '#ff9cf0', [-1.5, 17, 4.2], [1.4, 1, 0.3]));
  p.push(box('eyes', 'magic', '#ff9cf0', [1.5, 17, 4.2], [1.4, 1, 0.3]));
  for (const [arm, x] of [['armL', -7.6], ['armR', 7.6]]) {
    p.push(box(arm, 'rock', rock, [x, 10.6, 0], [4.4, 8.4, 4.6]));
    p.push(box(arm, 'rock', rockD, [x * 1.03, 5.2, 0.6], [5.6, 4.6, 5.6]));
    p.push(part(arm, 'spire', 'magic', CRYSTAL, [x * 1.03, 8, 2.6], [1.6, 2.6, 1.6], [0.6, 0, 0]));
  }
  return {
    bones: humanBones({ head: { p: [0, 14.5, 0] }, eyes: { parent: 'head', p: [0, 17, 4.2] }, armL: { p: [-7.2, 15, 0] }, armR: { p: [7.2, 15, 0] } }),
    parts: p,
    anim: 'golem',
    stance: 'heavy',
  };
}

function sentinel() {
  const p = [
    box('root', 'rock', SLATE, [0, 10.4, 0], [9.4, 10.6, 7.4]),
    box('root', 'magic', '#9fe3ff', [0, 10.2, 3.75], [5, 7, 0.5]),
    box('root', 'rock', '#4a5366', [0, 4.4, 0], [6.4, 3, 5.4]),
    part('root', 'spire', 'magic', CRYSTAL, [0, 1, 0], [3.2, 4.4, 3.2], [Math.PI, 0, 0]),
    box('root', 'plaster', '#d9e3ee', [0, 16.2, 2.2], [7.4, 5.2, 3.4]),
    box('root', 'plaster', '#b9c6d4', [0, 18.6, 2.4], [7.8, 0.8, 3.6]),
    box('eyes', 'magic', '#7fe0ff', [-1.7, 16.4, 3.95], [1.6, 1.1, 0.3]),
    box('eyes', 'magic', '#7fe0ff', [1.7, 16.4, 3.95], [1.6, 1.1, 0.3]),
  ];
  for (const sx of [-1, 1]) p.push(box('root', 'rock', '#4a5366', [sx * 6.2, 14.4, 0], [4, 4, 5.4]));
  // crystal crown
  p.push(part('top', 'spire', 'magic', VIOLET, [0, 22.6, 0], [3.2, 7.4, 3.2]));
  for (const sx of [-1, 1]) {
    p.push(part('top', 'spire', 'magic', CRYSTAL, [sx * 3, 21, 0], [2.6, 5.2, 2.6], [0, 0, sx * -0.25]));
    p.push(part('top', 'spire', 'magic', VIOLET, [sx * 5.4, 19.6, -0.4], [2, 3.8, 2], [0, 0, sx * -0.5]));
  }
  // floating fists
  for (const [h, x] of [['handL', -11.5], ['handR', 11.5]]) {
    p.push(part(h, 'rock', 'rock', '#6b768c', [x, 8, 3], [5.4, 5.4, 5.4]));
    p.push(part(h, 'spire', 'magic', CRYSTAL, [x, 11, 3], [2, 3, 2]));
  }
  // orbiting shards
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    p.push(part('orbit', 'spire', 'magic', i % 2 ? VIOLET : CRYSTAL, [Math.cos(a) * 13, 10, Math.sin(a) * 13], [1.8, 3.2, 1.8]));
  }
  return {
    bones: {
      root: { p: [0, 0, 0] },
      eyes: { parent: 'root', p: [0, 16.4, 4] },
      top: { parent: 'root', p: [0, 18.6, 0] },
      handL: { parent: 'root', p: [-11.5, 8, 3] },
      handR: { parent: 'root', p: [11.5, 8, 3] },
      orbit: { parent: 'root', p: [0, 10, 0] },
    },
    parts: p,
    anim: 'flyer',
    hover: 7,
    flapSpeed: 0,
  };
}

// ---------------------------------------------------------------- room decor

function decor(add, rng, x, z, low = false) {
  const r = low ? 0.6 + rng() * 0.4 : rng();
  if (r < 0.35) {
    const c = pick(rng, ['#7fd6e8', '#b88cff', '#a6ecff']);
    const h = 1 + rng() * 1.6;
    add(x, 0.5 + h / 2, z, c, { mat: 'magic', shape: 'spire', s: [0.8, h, 0.8], j: 0.02 });
    if (rng() < 0.6) add(x + 0.35, 0.9, z + 0.3, c, { mat: 'magic', shape: 'spire', s: [0.5, 0.9, 0.5], j: 0.02 });
  } else if (r < 0.6) {
    const h = 1 + Math.floor(rng() * 2);
    add(x, 0.5 + h / 2, z, pick(rng, ['#5a6478', '#4e5769']), { mat: 'rock', shape: 'spire', s: [1.1, h, 1.1] });
  } else if (r < 0.75) add(x, 0.7, z, pick(rng, ['#646e83', '#5a6478']), { mat: 'rock', shape: 'rock', s: 0.6 + rng() * 0.6, deco: 1 });
  else if (r < 0.85) {
    add(x, 0.62, z, '#ece4cf', { mat: 'bone', shape: 'logx', s: [0.9, 0.25, 0.25], r: Math.floor(rng() * 4), deco: 1 });
    add(x + 0.2, 0.7, z + 0.2, '#ece4cf', { mat: 'bone', shape: 'cube', s: 0.35, deco: 1 });
  } else add(x, 0.6, z, '#3d4a63', { mat: 'water', shape: 'slab', s: [1, 0.25, 1], deco: 1 });
}

// ---------------------------------------------------------------- registration

export const builders = {
  shardling,
  glimmerbat,
  rattler,
  geode,
  sentinel,
};

export const enemies = {
  shardling: { name: 'Shardling', hp: 40, atk: 9, spd: 1.3, attack: 'bite', melee: true, scale: 0.95, size: 0.6, trait: 'burst' },
  glimmerbat: { name: 'Glimmerbat', hp: 42, atk: 7, spd: 1.1, attack: 'dive', melee: true, scale: 0.9, size: 0.6, trait: 'lifesteal' },
  rattler: { name: 'Bone Rattler', hp: 68, atk: 10, spd: 1.6, attack: 'slash', melee: true, scale: 1, size: 0.6 },
  geode: { name: 'Geode Golem', hp: 300, atk: 15, spd: 2.2, attack: 'slam', melee: true, scale: 1.65, size: 1.0, trait: 'stunHit', elite: true },
  sentinel: { name: 'Prism Sentinel', hp: 980, atk: 19, spd: 2.3, attack: 'slam', melee: false, scale: 2.1, size: 1.5, trait: 'shieldSelf', boss: true, bolt: '#9fe3ff', slamAll: '#9fe3ff' },
};

export const biome = {
  key: 'grotto',
  tier: 1,
  name: 'Crystal Grotto',
  pools: [['shardling', 'shardling', 'rattler'], ['glimmerbat', 'rattler', 'shardling'], ['rattler', 'rattler', 'glimmerbat'], ['glimmerbat', 'glimmerbat', 'shardling', 'shardling']],
  elites: ['geode'],
  boss: 'sentinel',
  floor: ['#4a5366', '#525c70', '#434b5d'],
  floor2: ['#5d5878', '#544f6e'],
  wall: ['#5a6478', '#4e5769', '#646e83'],
  accent: '#7fd6e8',
  light: '#bfe9ff',
  fog: '#1c2233',
  sky: ['#121a2c', '#22304a', '#3a4a6a'],
  floorMat: (n) => (n > 1 ? 'stone' : 'rock'),
  decor,
};
