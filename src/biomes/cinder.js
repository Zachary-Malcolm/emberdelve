import { box, part, humanBones, eyes } from '../chars.js';
import { pick } from '../rng.js';

// Cinder Deeps: coal and obsidian, fired clay and brick, iron, glowing lava orange.

const COAL = '#3a3440';
const COAL_D = '#2a2630';
const LAVA = '#ff7a2f';
const FLAME = '#ffb347';
const CLAY = '#b5653a';
const CLAY_D = '#8a4a2a';

function cinderpup() {
  const p = [
    box('root', 'rock', COAL, [0, 4.6, 0], [9.4, 8, 8.8]),
    box('root', 'rock', COAL_D, [0, 0.8, 0], [9.8, 1.6, 9.2]),
    // glowing cracks
    box('root', 'ember', LAVA, [-3.2, 6.4, 4.45], [0.6, 3.4, 0.3], [0, 0, 0.5]),
    box('root', 'ember', LAVA, [3.6, 3.4, 4.45], [2.2, 0.6, 0.3], [0, 0, -0.3]),
    box('root', 'ember', LAVA, [4.75, 5.6, 1.4], [0.3, 3.2, 0.6], [0.4, 0, 0]),
    box('root', 'ember', LAVA, [-4.75, 3.6, -1.2], [0.3, 0.6, 2.6]),
    // ember mouth
    box('root', 'ember', FLAME, [0, 3.2, 4.45], [2.4, 0.8, 0.3]),
    ...eyes('#ffe066', { x: 2.1, y: 5.8, z: 4.45, w: 1.6, h: 1.9, glow: true }),
    // little stub ears
    box('top', 'rock', COAL, [-3.4, 9.2, 0.6], [2, 1.8, 2]),
    box('top', 'rock', COAL, [3.4, 9.2, 0.6], [2, 1.8, 2]),
    // a flame tuft on top
    part('top', 'spire', 'ember', FLAME, [0, 11.4, -0.4], [3.4, 4.6, 3.4]),
    part('top', 'spire', 'ember', LAVA, [1.6, 10.4, 0.8], [2, 2.8, 2], [0, 0, -0.3]),
    part('top', 'spire', 'ember', '#ffd36b', [-1.2, 10.2, 0.4], [1.6, 2.2, 1.6], [0, 0, 0.3]),
  ];
  return { bones: { root: { p: [0, 0, 0] }, eyes: { parent: 'root', p: [0, 5.8, 4.5] }, top: { parent: 'root', p: [0, 8.6, 0] } }, parts: p, anim: 'blob' };
}

function ashmoth() {
  const fur = '#7a706a';
  const wing = '#b3a99e';
  const p = [
    box('root', 'fur', fur, [0, 6.4, 0], [5.4, 6.4, 5]),
    box('root', 'fur', '#e6ddd0', [0, 8.8, 0.4], [6.4, 2, 5.6]),
    part('root', 'orb', 'ember', LAVA, [0, 2.6, -1.4], [4, 4.4, 4]),
    box('root', 'fur', '#5a524c', [0, 4.2, -1.2], [4.6, 0.8, 4.6]),
    ...eyes('#2a2238', { x: 1.5, y: 7.2, z: 2.55, w: 1.7, h: 2 }),
    box('root', 'fur', '#ffb3a0', [0, 5.4, 2.55], [1.2, 0.5, 0.3]),
  ];
  // feathery antennae
  for (const sx of [-1, 1]) {
    p.push(box('root', 'fur', '#5a524c', [sx * 1.4, 11.2, 1.2], [0.5, 3, 0.5], [0.3, 0, sx * -0.4]));
    p.push(box('root', 'fur', '#e6ddd0', [sx * 2.3, 12.6, 1.6], [2, 1.4, 0.5], [0.3, 0, sx * -0.4]));
  }
  for (const sx of [-1, 1]) {
    const w = sx < 0 ? 'wingL' : 'wingR';
    p.push(box(w, 'cloth', wing, [sx * 6.6, 7.6, -0.4], [8.2, 0.5, 6.4]));
    p.push(box(w, 'cloth', '#9a9086', [sx * 5.6, 5.8, -1.4], [5.4, 0.5, 4.4]));
    p.push(box(w, 'ember', '#ff9a3c', [sx * 7.6, 7.95, 0.2], [2.2, 0.3, 2.2]));
    p.push(box(w, 'cloth', '#4a4440', [sx * 7.6, 8.0, 0.2], [1, 0.32, 1]));
    p.push(box(w, 'cloth', '#e6ddd0', [sx * 10.4, 7.6, -0.4], [0.6, 0.6, 6]));
  }
  return {
    bones: { root: { p: [0, 0, 0] }, eyes: { parent: 'root', p: [0, 7.2, 2.6] }, wingL: { parent: 'root', p: [-2.6, 7.4, 0] }, wingR: { parent: 'root', p: [2.6, 7.4, 0] }, head: { parent: 'root', p: [0, 6.4, 0] } },
    parts: p,
    anim: 'flyer',
    hover: 11,
    flapSpeed: 8,
  };
}

function kilnkeeper() {
  const p = [];
  for (const [leg, x] of [['legL', -2.4], ['legR', 2.4]]) {
    p.push(box(leg, 'brick', CLAY_D, [x, 2.8, 0], [3.4, 3.6, 3.4]));
    p.push(box(leg, 'stone', '#5a3a2a', [x, 0.8, 0.4], [3.8, 1.6, 4.2]));
  }
  // the kiln body with a glowing oven mouth
  p.push(box('torso', 'brick', CLAY, [0, 9.2, 0], [10.4, 9, 7.4]));
  p.push(box('torso', 'stone', '#5a3a2a', [0, 9.4, 3.75], [5.6, 4.6, 0.3]));
  p.push(box('torso', 'ember', LAVA, [0, 8.6, 3.85], [4.2, 3, 0.3]));
  p.push(box('torso', 'ember', FLAME, [0, 8.0, 3.95], [2.6, 1.2, 0.3]));
  p.push(box('torso', 'metal', '#3a3440', [0, 11.9, 3.9], [6.2, 0.8, 0.5]));
  p.push(box('torso', 'brick', CLAY_D, [0, 4.9, 0], [10.8, 1.2, 7.8]));
  p.push(box('torso', 'brick', CLAY_D, [0, 13.8, 0], [10.8, 1, 7.8]));
  // round clay head with glowing slit eyes and a chimney
  p.push(box('head', 'brick', '#c4733f', [0, 17.2, 0.2], [8.4, 5.6, 7.2]));
  p.push(box('head', 'brick', CLAY_D, [0, 14.8, 0.2], [6, 1, 5.4]));
  for (const sx of [-1, 1]) p.push(box('eyes', 'magic', '#ffd36b', [sx * 1.9, 17.4, 3.85], [2, 1.1, 0.4]));
  p.push(box('head', 'brick', '#d98a55', [0, 15.9, 3.85], [1.4, 0.6, 0.3]));
  p.push(box('hat', 'brick', CLAY_D, [2, 21.6, -0.6], [3.2, 3.6, 3.2]));
  p.push(box('hat', 'brick', '#6e3a24', [2, 23.6, -0.6], [3.8, 0.8, 3.8]));
  p.push(part('hat', 'blob', 'ember', FLAME, [2, 24.6, -0.6], [2.2, 1.6, 2.2]));
  // arms in big oven mitts; a long ladle of coals
  for (const [arm, x] of [['armL', -6.2], ['armR', 6.2]]) {
    p.push(box(arm, 'brick', CLAY_D, [x, 10.4, 0], [2.6, 4.4, 2.8]));
    p.push(box(arm, 'fabric', '#e8d6b8', [x, 7.2, 0.2], [3.4, 3, 3.4]));
    p.push(box(arm, 'fabric', '#c94a3a', [x, 8.6, 0.2], [3.6, 0.8, 3.6]));
  }
  p.push(box('handR', 'wood', '#6b4428', [6.2, 9.2, 1.6], [0.9, 9, 0.9]));
  p.push(box('handR', 'metal', '#5d6470', [6.2, 14, 2.2], [2.6, 1, 2.6]));
  p.push(part('handR', 'blob', 'ember', LAVA, [6.2, 14.8, 2.2], [2, 1.4, 2]));
  return {
    bones: humanBones({ head: { p: [0, 14.2, 0] }, eyes: { parent: 'head', p: [0, 17.4, 3.9] }, armL: { p: [-6.2, 12.4, 0] }, armR: { p: [6.2, 12.4, 0] }, handR: { p: [6.2, 6.6, 0.4], rest: [0.35, 0, 0] }, hat: { p: [0, 20, 0] } }),
    parts: p,
    anim: 'human',
  };
}

function cindercrab() {
  const shell = '#5a3a36';
  const shellD = '#42292a';
  const p = [
    box('root', 'rock', shellD, [0, 4.4, 0], [11, 3.6, 9]),
    box('root', 'rock', shell, [0, 7, -0.4], [10, 2.4, 8.4]),
    box('root', 'rock', shell, [0, 8.6, -0.6], [7, 1.2, 6.4]),
    box('root', 'ember', LAVA, [0, 8.0, 3.45], [6, 0.6, 0.3]),
    box('root', 'ember', LAVA, [-3, 9.3, -0.6], [0.6, 0.3, 4.4]),
    box('root', 'ember', LAVA, [2.6, 9.3, -1.6], [0.6, 0.3, 3]),
    part('root', 'rock', 'rock', COAL, [-2.4, 10, -1.6], [2.6, 2, 2.6]),
    part('root', 'rock', 'rock', COAL, [2.8, 9.8, 0.6], [2, 1.6, 2]),
  ];
  // eye stalks
  for (const sx of [-1, 1]) {
    p.push(box('head', 'rock', shellD, [sx * 1.8, 8.6, 4.4], [0.9, 3, 0.9]));
    p.push(box('eyes', 'magic', '#ffe066', [sx * 1.8, 10.6, 4.4], [1.6, 1.6, 1.6]));
    p.push(box('eyes', 'eye', '#2a2238', [sx * 1.8, 10.6, 5.25], [0.8, 0.8, 0.2]));
  }
  // big claws, one bigger than the other
  for (const [sx, k] of [[-1, 1], [1, 1.35]]) {
    p.push(box('head', 'rock', shell, [sx * 4.8, 5.2, 5.2], [2, 2, 3.4], [0, sx * 0.4, 0]));
    p.push(box('head', 'rock', '#7a4a40', [sx * 5.6, 5.8, 8], [3.4 * k, 3 * k, 3.6 * k]));
    p.push(box('head', 'rock', '#7a4a40', [sx * 5.6, 4.0 - k, 9.6], [2.6 * k, 1.2 * k, 2.4 * k]));
    p.push(box('head', 'ember', FLAME, [sx * 5.6, 4.6, 9.9], [1.8 * k, 0.4, 1.6 * k]));
  }
  const bones = { root: { p: [0, 0, 0] }, head: { parent: 'root', p: [0, 5, 3.6] }, eyes: { parent: 'head', p: [0, 10.6, 4.4] } };
  [2, -0.6, -3.2].forEach((z, i) => {
    for (const sx of [-1, 1]) {
      const n = 'leg' + (i * 2 + (sx > 0 ? 1 : 0));
      bones[n] = { parent: 'root', p: [sx * 5, 4, z] };
      p.push(box(n, 'rock', shellD, [sx * 6.4, 4, z], [3, 1, 1], [0, 0, sx * -0.5]));
      p.push(box(n, 'rock', COAL_D, [sx * 7.6, 1.6, z], [1, 3.2, 1]));
    }
  });
  return { bones, parts: p, anim: 'bug' };
}

function forgehound() {
  const iron = '#4a4e58';
  const ironD = '#363a44';
  const p = [
    box('root', 'metal', iron, [0, 8.4, -1], [7.6, 6, 12]),
    box('root', 'metal', ironD, [0, 11.6, -1], [6.4, 1, 10.4]),
    // lava belly seams
    box('root', 'ember', LAVA, [3.85, 8, -1], [0.3, 1.2, 9]),
    box('root', 'ember', LAVA, [-3.85, 8, -1], [0.3, 1.2, 9]),
    box('root', 'ember', FLAME, [0, 5.35, -1], [4.6, 0.3, 8]),
    // rivets
    box('root', 'metal', '#8a8f9a', [3.9, 10.2, 2.6], [0.4, 0.8, 0.8]),
    box('root', 'metal', '#8a8f9a', [-3.9, 10.2, 2.6], [0.4, 0.8, 0.8]),
    box('root', 'metal', '#8a8f9a', [3.9, 10.2, -4.4], [0.4, 0.8, 0.8]),
    box('root', 'metal', '#8a8f9a', [-3.9, 10.2, -4.4], [0.4, 0.8, 0.8]),
    // a little chimney on its back
    box('root', 'metal', ironD, [0, 13.2, -4], [2, 2.4, 2]),
    part('root', 'blob', 'ember', FLAME, [0, 14.8, -4], [1.6, 1.2, 1.6]),
  ];
  // head: boxy iron snout, ember eyes, a glowing jaw
  p.push(box('head', 'metal', iron, [0, 10.6, 6.6], [6.4, 5.4, 5]));
  p.push(box('head', 'metal', ironD, [0, 9.2, 10], [4.2, 3, 3.4]));
  p.push(box('head', 'metal', '#2a2630', [0, 10.4, 11.75], [1.6, 1, 0.3]));
  p.push(box('head', 'ember', LAVA, [0, 7.6, 10.6], [2.8, 0.6, 2.4]));
  for (const sx of [-1, 1]) {
    p.push(box('eyes', 'magic', '#ffcf45', [sx * 1.9, 11.6, 9.15], [1.4, 1.2, 0.4]));
    p.push(box('head', 'metal', ironD, [sx * 2.4, 14.4, 5.4], [1.8, 2.6, 1.4], [-0.3, 0, sx * 0.25]));
  }
  // tail: a little flame
  p.push(box('tail', 'metal', iron, [0, 11.2, -8.2], [1.4, 1.4, 3]));
  p.push(part('tail', 'spire', 'ember', FLAME, [0, 12.8, -9.8], [2, 3.2, 2], [-0.6, 0, 0]));
  const bones = { root: { p: [0, 0, 0] }, head: { parent: 'root', p: [0, 9.6, 4.4] }, eyes: { parent: 'head', p: [0, 11.6, 9.2] }, tail: { parent: 'root', p: [0, 11, -6.8] } };
  [[3.2, 0], [-5.2, 2]].forEach(([z, i]) => {
    for (const sx of [-1, 1]) {
      const n = 'leg' + (i + (sx > 0 ? 1 : 0));
      bones[n] = { parent: 'root', p: [sx * 2.8, 6.4, z] };
      p.push(box(n, 'metal', ironD, [sx * 2.8, 3.6, z], [2.2, 5.6, 2.4]));
      p.push(box(n, 'metal', iron, [sx * 2.8, 0.8, z + 0.6], [2.8, 1.6, 3.4]));
    }
  });
  return { bones, parts: p, anim: 'bug' };
}

function bellows() {
  const brick = '#5a3a33';
  const brickD = '#462c27';
  const p = [];
  for (const [leg, x] of [['legL', -3], ['legR', 3]]) {
    p.push(box(leg, 'brick', brickD, [x, 2.8, 0], [4.8, 5.4, 4.8]));
    p.push(box(leg, 'metal', '#3a3f4a', [x, 0.8, 0.6], [5.4, 1.6, 6]));
  }
  // the forge body: brick, an iron grate over a fire
  p.push(box('torso', 'brick', brick, [0, 11, 0], [13.6, 11.2, 9.4]));
  p.push(box('torso', 'ember', LAVA, [0, 10.6, 4.6], [7.6, 5.6, 0.4]));
  p.push(box('torso', 'ember', FLAME, [0, 9.4, 4.75], [5.4, 2.2, 0.4]));
  for (const x of [-2.8, -0.9, 0.9, 2.8]) p.push(box('torso', 'metal', '#2a2630', [x, 10.6, 4.95], [0.7, 6, 0.5]));
  p.push(box('torso', 'metal', '#3a3f4a', [0, 13.9, 4.95], [8.8, 0.9, 0.6]));
  p.push(box('torso', 'metal', '#3a3f4a', [0, 7.3, 4.95], [8.8, 0.9, 0.6]));
  p.push(box('torso', 'metal', '#3a3f4a', [0, 16.8, 0], [14.4, 1.2, 10.2]));
  p.push(box('torso', 'metal', '#3a3f4a', [0, 5.6, 0], [14.4, 1.2, 10.2]));
  // leather bellows on the back
  p.push(box('torso', 'leather', '#8a5a3a', [0, 11, -6], [8.4, 6.6, 2.6]));
  for (const y of [9, 11, 13]) p.push(box('torso', 'leather', '#6e4630', [0, y, -6.1], [8.8, 0.6, 2.8]));
  p.push(box('torso', 'wood', '#6b4428', [0, 11, -7.6], [9, 7.4, 0.8]));
  p.push(box('torso', 'metal', '#5d6470', [0, 6.6, -6.6], [1.6, 2.6, 1.6]));
  // head: an anvil with ember eyes
  p.push(box('head', 'metal', '#3a3f4a', [0, 18.6, 0.4], [6, 2.2, 5]));
  p.push(box('head', 'metal', '#5d6470', [0, 21.2, 0.4], [11, 3, 6]));
  p.push(box('head', 'metal', '#6d7480', [0, 22.9, 0.4], [11, 0.4, 6]));
  p.push(box('head', 'metal', '#5d6470', [7.2, 21.6, 0.4], [3.4, 1.8, 3.6]));
  p.push(box('head', 'metal', '#5d6470', [9.4, 22, 0.4], [1.6, 1, 2]));
  p.push(box('head', 'metal', '#5d6470', [-6.4, 21.4, 0.4], [1.8, 2.4, 6]));
  for (const sx of [-1, 1]) p.push(box('eyes', 'ember', '#ffd36b', [sx * 2.2, 21.2, 3.45], [1.8, 1.4, 0.4]));
  p.push(box('head', 'metal', '#2a2630', [0, 19.9, 3.45], [3.4, 0.5, 0.3]));
  // a crown of little chimneys
  for (const [x, z, h] of [[-3.4, -1, 2.4], [0.2, -1.6, 3.6], [3.4, -0.8, 2]]) {
    p.push(box('hat', 'brick', brickD, [x, 23.1 + h / 2, z], [2, h, 2]));
    p.push(part('hat', 'blob', 'ember', FLAME, [x, 23.5 + h, z], [1.6, 1.2, 1.6]));
  }
  // arms: a hammer and a pair of tongs
  for (const [arm, x] of [['armL', -9], ['armR', 9]]) {
    p.push(box(arm, 'brick', brick, [x, 13, 0], [4.4, 6.4, 4.6]));
    p.push(box(arm, 'metal', '#3a3f4a', [x, 15.6, 0], [5, 1.2, 5.2]));
    p.push(box(arm, 'metal', '#4a4e58', [x * 1.02, 8.2, 0.4], [5, 4, 5]));
  }
  p.push(box('handR', 'wood', '#6b4428', [9.2, 6.8, 2.6], [1.3, 1.3, 8]));
  p.push(box('handR', 'metal', '#5d6470', [9.2, 6.8, 7.4], [4.4, 4.4, 3.4]));
  p.push(box('handR', 'metal', '#8a8f9a', [9.2, 6.8, 9.2], [4.6, 4.6, 0.4]));
  p.push(box('handL', 'metal', '#3a3f4a', [-9.6, 4.4, 2.6], [0.8, 5, 0.8], [0.25, 0, 0]));
  p.push(box('handL', 'metal', '#3a3f4a', [-8.4, 4.4, 2.6], [0.8, 5, 0.8], [0.25, 0, 0]));
  p.push(part('handL', 'orb', 'ember', FLAME, [-9, 2, 3.4], [2.2, 2.2, 2.2]));
  return {
    bones: humanBones({
      head: { p: [0, 17.6, 0] },
      eyes: { parent: 'head', p: [0, 21.2, 3.5] },
      hat: { parent: 'head', p: [0, 23, 0] },
      armL: { p: [-8.6, 16, 0] },
      armR: { p: [8.6, 16, 0] },
      handL: { p: [-9, 6.4, 0.4] },
      handR: { p: [9.2, 6.4, 0.4] },
      legL: { p: [-3, 5.4, 0] },
      legR: { p: [3, 5.4, 0] },
      torso: { p: [0, 5.4, 0] },
    }),
    parts: p,
    anim: 'golem',
    stance: 'heavy',
  };
}

// ---------------------------------------------------------------- room decor

function decor(add, rng, x, z, low = false) {
  const r = low ? 0.55 + rng() * 0.45 : rng();
  if (r < 0.26) {
    // obsidian shards
    const h = 1 + rng() * 1.8;
    add(x, 0.5 + h / 2, z, pick(rng, ['#231f2a', '#2e2a36', '#1c1922']), { mat: 'metal', shape: 'spire', s: [0.9, h, 0.9], j: 0.02 });
    if (rng() < 0.5) add(x + 0.35, 0.85, z - 0.3, '#2e2a36', { mat: 'metal', shape: 'spire', s: [0.5, 0.8, 0.5], j: 0.02 });
  } else if (r < 0.45) {
    // basalt columns
    const h = 1 + Math.floor(rng() * 3);
    for (let y = 1; y <= h; y++) add(x, y, z, pick(rng, ['#3a3440', '#454050']), { mat: 'rock', shape: 'pillar', s: [0.9, 1, 0.9] });
    add(x, h + 0.55, z, '#5a4038', { mat: 'stone', shape: 'slab', s: [1, 0.2, 1] });
  } else if (r < 0.6) {
    // a little lava pool with a coal rim
    add(x, 0.56, z, '#ff6b2c', { mat: 'ember', shape: 'slab', s: [1, 0.2, 1], deco: 1, j: 0.08 });
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0.1], [0.1, 0.5]]) add(x + dx, 0.62, z + dz, '#2a2630', { mat: 'rock', shape: 'rock', s: 0.3, deco: 1 });
  } else if (r < 0.74) add(x, 0.75, z, pick(rng, ['#8a8580', '#9a948e', '#7a7570']), { mat: 'plaster', shape: 'blob', s: 0.55 + rng() * 0.4, deco: 1 }); // ash heap
  else if (r < 0.84) {
    // an old anvil
    add(x, 0.65, z, '#3a3f4a', { mat: 'metal', shape: 'post', s: [0.5, 0.3, 0.5], deco: 1 });
    add(x, 0.95, z, '#5d6470', { mat: 'metal', shape: 'slab', s: [0.9, 0.3, 0.5], deco: 1 });
  } else if (r < 0.93) add(x, 0.7, z, pick(rng, ['#3a3440', '#2e2a33']), { mat: 'rock', shape: 'rock', s: 0.5 + rng() * 0.6, deco: 1 });
  else add(x, 0.75, z, '#ffb347', { mat: 'ember', shape: 'spire', s: [0.4, 0.7, 0.4], deco: 1, j: 0.1 }); // a flicker of flame
}
// ---------------------------------------------------------------- registration

export const builders = {
  cinderpup,
  ashmoth,
  kilnkeeper,
  cindercrab,
  forgehound,
  bellows,
};

export const enemies = {
  cinderpup: { name: 'Cinderpup', hp: 46, atk: 7, spd: 1.5, attack: 'hop', melee: true, scale: 0.95, size: 0.6, trait: 'burn' },
  ashmoth: { name: 'Ash Moth', hp: 38, atk: 7, spd: 1.0, attack: 'dive', melee: true, scale: 0.9, size: 0.6 },
  kilnkeeper: { name: 'Kilnkeeper', hp: 56, atk: 7, spd: 2.0, attack: 'cast', melee: false, scale: 0.95, size: 0.6, trait: 'burn', bolt: '#ff9a3c' },
  cindercrab: { name: 'Cinder Crab', hp: 74, atk: 9, spd: 1.8, attack: 'bite', melee: true, scale: 1, size: 0.7, trait: 'shieldSelf' },
  forgehound: { name: 'Forgehound', hp: 290, atk: 15, spd: 1.9, attack: 'bite', melee: true, scale: 1.5, size: 1.0, trait: 'enrage', elite: true },
  bellows: { name: 'Grand Bellows', hp: 1040, atk: 20, spd: 2.4, attack: 'slam', melee: true, scale: 2.25, size: 1.5, trait: 'summon', boss: true, summon: 'cinderpup', slamAll: '#ff8a3c', slamBurn: true },
};

export const biome = {
  key: 'cinder',
  tier: 2,
  name: 'Cinder Deeps',
  pools: [['cinderpup', 'cinderpup', 'kilnkeeper'], ['ashmoth', 'cindercrab', 'cinderpup'], ['cindercrab', 'kilnkeeper', 'ashmoth'], ['ashmoth', 'ashmoth', 'cinderpup', 'kilnkeeper']],
  elites: ['forgehound'],
  boss: 'bellows',
  floor: ['#3a3440', '#332e38', '#413a46'],
  floor2: ['#5a4038', '#4e382f'],
  wall: ['#2e2a33', '#3a3440', '#454050'],
  accent: '#ff8a3c',
  lava: '#d9541f', // floor tiles with the 'ember' material
  light: '#ffb37a',
  fog: '#2a1a18',
  sky: ['#1a1012', '#2e1a16', '#4a2a1e'],
  floorMat: (n) => (n > 1.85 ? 'ember' : n > 1 ? 'stone' : 'rock'), // rare glowing lava seams
  decor,
};
