import { box, part, humanBones, humanBody, eyes } from './chars.js';

/*
 * Enemies of the Underroot, in px on the same grid as the heroes (chars.js).
 * Each biome has a palette family so a room reads as one place:
 *   Mossy Hollow   greens, bark browns, toadstool reds and purples, warm ember eyes
 *   Crystal Grotto slate blue-greys, glowing cyan / violet crystal, bone white
 */

// ---------------------------------------------------------------- Mossy Hollow

function mossling(v = {}) {
  const body = v.body || '#7fbf4f';
  const dark = v.dark || '#5f9a3e';
  const cap = v.cap || '#4f8f3a';
  const p = [
    box('root', 'moss', body, [0, 4.8, 0], [9, 8.4, 9]),
    box('root', 'moss', dark, [0, 0.8, 0], [9.4, 1.6, 9.4]),
    box('top', 'leaves', cap, [0, 9.5, 0], [9.8, 1.8, 9.8]),
    box('top', 'leaves', cap, [-3.4, 8.3, 4.55], [2.2, 1.4, 0.8]),
    box('top', 'leaves', cap, [2.0, 8.1, 4.6], [2.8, 1.8, 0.8]),
    box('top', 'leaves', cap, [4.6, 8.4, 1], [0.8, 1.4, 3.2]),
    box('top', 'wood', '#6b8f3a', [0.8, 11.7, 0], [0.8, 2.6, 0.8]),
    box('top', 'leaves', '#8fd65a', [2.2, 12.8, 0], [2.6, 0.7, 1.6], [0, 0, 0.45]),
    box('top', 'leaves', '#8fd65a', [-0.6, 12.5, 0], [2.2, 0.7, 1.4], [0, 0, -0.45]),
    ...eyes('#1e2a1a', { x: 2, y: 5.6, z: 4.55, w: 1.7, h: 2.8 }),
    box('root', 'eye', '#2e3a22', [0, 3.4, 4.55], [1.8, 0.6, 0.3]),
  ];
  if (v.flower) p.push(part('top', 'orb', 'cloth', v.flower, [-2.6, 10.8, -1.4], [2.2, 2.2, 2.2]));
  return { bones: { root: { p: [0, 0, 0] }, eyes: { parent: 'root', p: [0, 5.6, 4.6] }, top: { parent: 'root', p: [0, 9.4, 0] } }, parts: p, anim: 'blob' };
}

function grubkin() {
  const pal = { skin: '#9db86a', shirt: '#7a6a8a', sleeve: '#9db86a', pants: '#5a4a3a', boots: '#3a2e24', belt: '#6b4428' };
  const p = humanBody(pal);
  p.push(box('head', 'skin', '#86a35a', [0, 14.9, 4.7], [2.4, 2.2, 1.8])); // big nose
  for (const sx of [-1, 1]) {
    p.push(box('head', 'skin', '#9db86a', [sx * 5.7, 16.4, 0], [3, 1.6, 1.4], [0, 0, sx * 0.35]));
    p.push(box('head', 'skin', '#86a35a', [sx * 7.3, 17.2, 0], [1.4, 1, 1], [0, 0, sx * 0.35]));
    p.push(box('head', 'eye', '#2e2a20', [sx * 2.1, 17.3, 4.4], [2.2, 0.6, 0.4], [0, 0, sx * 0.3]));
  }
  // cracked clay pot for a helmet
  p.push(box('head', 'stone', '#b0643a', [0, 20.1, 0], [9.6, 2.8, 9]));
  p.push(box('head', 'stone', '#8a4a2a', [0, 18.6, 0], [10.4, 0.8, 9.8]));
  p.push(box('head', 'eye', '#5e2f1a', [2.2, 20.4, 4.55], [0.5, 1.8, 0.3], [0, 0, 0.4]));
  // rag tunic edge + rusty cleaver
  p.push(box('torso', 'cloth', '#665878', [0, 5.0, 0], [8.6, 1.4, 5.6]));
  p.push(box('handR', 'wood', '#6b4428', [5.3, 6, 0.4], [1.1, 3, 1.1]));
  p.push(box('handR', 'metal', '#9a8a7a', [5.3, 10.2, 1.3], [0.7, 4.8, 3.4]));
  p.push(box('handR', 'metal', '#b5a594', [5.3, 10.2, 2.9], [0.8, 4.8, 0.4]));
  return { bones: humanBones({ handR: { rest: [0.5, 0, 0] } }), parts: p, anim: 'human', stance: 'crouch' };
}

function gloomcap() {
  const stem = '#e9dcc0';
  const cap = '#8d5fc4';
  const capD = '#6b44a0';
  const spot = '#f4ead7';
  const p = [];
  for (const [leg, x] of [['legL', -2], ['legR', 2]]) {
    p.push(box(leg, 'plaster', '#d9c9a8', [x, 3.4, 0], [3, 3, 3]));
    p.push(box(leg, 'leather', '#6b5a4a', [x, 1, 0.4], [3.4, 2, 4]));
  }
  p.push(box('torso', 'plaster', stem, [0, 8, 0], [7, 8, 6]));
  p.push(box('torso', 'plaster', '#d9c9a8', [0, 4.6, 0], [7.4, 1.2, 6.4]));
  p.push(...eyes('#3a2a4a', { x: 1.6, y: 9.4, z: 3.05, w: 1.2, h: 2 }));
  p.push(box('torso', 'eye', '#7a5a8a', [0, 7.2, 3.05], [1.4, 0.5, 0.3]));
  for (const [arm, x] of [['armL', -4.4], ['armR', 4.4]]) {
    p.push(box(arm, 'plaster', stem, [x, 8.6, 0], [2, 3.4, 2]));
    p.push(box(arm, 'plaster', '#d9c9a8', [x, 6.6, 0.2], [2.2, 1.6, 2.2]));
  }
  // the cap: big, spotted, gills underneath
  p.push(box('head', 'cloth', cap, [0, 14.4, 0], [14, 4.2, 14]));
  p.push(box('head', 'cloth', cap, [0, 17.2, 0], [10, 1.8, 10]));
  p.push(box('head', 'cloth', capD, [0, 12.1, 0], [14.4, 0.8, 14.4]));
  p.push(box('head', 'plaster', '#d9c3a0', [0, 11.9, 0], [11.4, 0.8, 11.4]));
  for (const [x, y, z, s] of [[3.5, 18.2, 2.6, 2.4], [-3.4, 18.2, -2.2, 2], [-2.4, 16.6, 4.4, 1.8], [7.05, 14.8, 1, 2], [-7.05, 15, -2, 1.6], [1.6, 15, 7.05, 2.2], [-4.6, 14.4, 7.05, 1.4], [4.4, 14.6, -7.05, 1.8]]) {
    const sz = [Math.abs(x) > 6.9 ? 0.4 : s, Math.abs(z) > 6.9 || Math.abs(x) > 6.9 ? s : 0.6, Math.abs(z) > 6.9 ? 0.4 : s];
    p.push(box('head', 'plaster', spot, [x, y, z], sz));
  }
  p.push(part('head', 'orb', 'magic', '#c99cff', [0, 19.4, 0], [1.6, 1.6, 1.6]));
  return {
    bones: humanBones({ head: { p: [0, 12, 0] }, eyes: { parent: 'torso', p: [0, 9.4, 3.1] }, armL: { p: [-4.4, 10, 0] }, armR: { p: [4.4, 10, 0] } }),
    parts: p,
    anim: 'human',
  };
}

function thornback() {
  const chit = '#2f5d5a';
  const shell = '#3f7a6a';
  const dark = '#24423f';
  const thorn = '#e8e0cc';
  const p = [
    box('root', 'metal', dark, [0, 5, -1], [10, 4.6, 12]),
    box('root', 'metal', shell, [0, 8.1, -1.2], [9, 2, 11]),
    box('root', 'metal', chit, [0, 9.4, -1.2], [3, 1, 10]),
    box('root', 'metal', shell, [0, 6.4, -7.4], [7, 3.4, 1.4]),
  ];
  for (const [x, y, z, s] of [[0, 11.2, 1.5, 3.2], [0, 11.4, -2, 3.4], [0, 10.8, -5.2, 2.8], [-3.6, 10.2, -0.6, 2.4], [3.6, 10.2, -0.6, 2.4], [-3.4, 10, -4.4, 2], [3.4, 10, -4.4, 2]])
    p.push(part('root', 'spire', 'bone', thorn, [x, y, z], [1.8, s, 1.8]));
  p.push(box('head', 'metal', chit, [0, 5.2, 6.2], [7, 4.6, 3.6]));
  p.push(part('head', 'spire', 'bone', thorn, [0, 8.4, 8.2], [2.2, 5.4, 2.2], [0.55, 0, 0]));
  for (const sx of [-1, 1]) {
    p.push(box('head', 'bone', '#cfc4a8', [sx * 2.2, 3.2, 8.6], [1, 1, 2.6], [0, sx * -0.4, 0]));
    p.push(box('eyes', 'magic', '#ffb347', [sx * 2.2, 6.2, 8.05], [1.3, 1.3, 0.4]));
  }
  const legs = [3, -1, -5];
  const bones = { root: { p: [0, 0, 0] }, head: { parent: 'root', p: [0, 5, 4.2] }, eyes: { parent: 'head', p: [0, 6.2, 8] } };
  legs.forEach((z, i) => {
    for (const sx of [-1, 1]) {
      const n = 'leg' + (i * 2 + (sx > 0 ? 1 : 0));
      bones[n] = { parent: 'root', p: [sx * 5, 4.6, z] };
      p.push(box(n, 'metal', dark, [sx * 6.4, 4.4, z], [3.2, 1.1, 1.1], [0, 0, sx * -0.45]));
      p.push(box(n, 'metal', '#1c3330', [sx * 7.8, 1.8, z], [1.1, 3.6, 1.1]));
    }
  });
  return { bones, parts: p, anim: 'bug' };
}

function rootheart() {
  const bark = '#7a5434';
  const barkD = '#5e4029';
  const moss = '#6fae5a';
  const p = [];
  for (const [leg, x] of [['legL', -2.8], ['legR', 2.8]]) {
    p.push(box(leg, 'log', '#6b4a2f', [x, 2.8, 0], [4.6, 5.4, 4.6]));
    p.push(box(leg, 'log', barkD, [x * 1.25, 0.6, 1.8], [2.2, 1.2, 3.2]));
  }
  p.push(box('torso', 'log', bark, [0, 10.4, 0], [12.4, 10.4, 8.4]));
  for (const sx of [-1, 1]) p.push(box('torso', 'log', barkD, [sx * 3.4, 10, 4.25], [1, 9, 0.4]));
  p.push(box('torso', 'moss', moss, [0, 15.8, 0], [12.8, 1.6, 8.8]));
  for (const sx of [-1, 1]) p.push(box('torso', 'moss', moss, [sx * 5.4, 15.2, 0.2], [3.4, 2.4, 9]));
  p.push(box('torso', 'moss', '#5c9a48', [-4.2, 13.6, 4.3], [3.6, 1.6, 0.6]));
  // glowing heart in a ring of bark
  p.push(part('torso', 'orb', 'ember', '#ffb347', [0, 10.6, 4.1], [4.4, 4.4, 2.4]));
  p.push(box('torso', 'log', barkD, [0, 13.4, 4.4], [5.6, 0.9, 0.9]));
  p.push(box('torso', 'log', barkD, [0, 7.8, 4.4], [5.6, 0.9, 0.9]));
  for (const sx of [-1, 1]) p.push(box('torso', 'log', barkD, [sx * 2.6, 10.6, 4.4], [0.9, 4.6, 0.9]));
  // stump head with a cut-ring top, ember eyes, a crown of toadstools
  p.push(box('head', 'log', '#8a6040', [0, 19.4, 0.6], [8, 5.6, 7]));
  p.push(box('head', 'wood', '#c9a46a', [0, 22.3, 0.6], [7.2, 0.4, 6.2]));
  p.push(box('eyes', 'ember', '#ffcf6a', [-1.9, 19.4, 4.15], [1.6, 1.8, 0.4]));
  p.push(box('eyes', 'ember', '#ffcf6a', [1.9, 19.4, 4.15], [1.6, 1.8, 0.4]));
  p.push(box('head', 'log', barkD, [0, 17.4, 4.2], [4.6, 0.8, 0.4]));
  for (const [x, z, h, w] of [[-2.4, -1, 1.4, 3.6], [1.8, 0.6, 2.2, 4.2], [0, -2.6, 1.2, 3]]) {
    p.push(box('hat', 'plaster', '#efe2c4', [x, 22.6 + h / 2, z], [1, h, 1]));
    p.push(box('hat', 'cloth', '#e0533a', [x, 23.2 + h, z], [w, 1.4, w]));
    p.push(box('hat', 'plaster', '#f4ead7', [x + w * 0.2, 23.95 + h, z + w * 0.15], [0.9, 0.3, 0.9]));
  }
  // log arms, leafy cuffs, boulder fists
  for (const [arm, x] of [['armL', -8.6], ['armR', 8.6]]) {
    p.push(box(arm, 'log', bark, [x, 11.2, 0], [4.6, 8.4, 4.6]));
    p.push(box(arm, 'leaves', '#4f9a3c', [x, 14.6, 0], [5.4, 2, 5.4]));
    p.push(part(arm, 'rock', 'rock', '#8f97a3', [x * 1.02, 5.6, 0.4], [6, 5, 6]));
  }
  // a sapling on one shoulder
  p.push(box('torso', 'wood', '#6b4a2f', [4.6, 18, -1.8], [0.8, 3.4, 0.8]));
  p.push(part('torso', 'blob', 'leaves', '#62c04a', [4.6, 20.2, -1.8], [3.2, 2.8, 3.2]));
  return {
    bones: humanBones({
      head: { p: [0, 16.5, 0] },
      eyes: { parent: 'head', p: [0, 19.4, 4.2] },
      hat: { parent: 'head', p: [0, 22.4, 0] },
      armL: { p: [-8.2, 15, 0] },
      armR: { p: [8.2, 15, 0] },
      legL: { p: [-2.8, 5.4, 0] },
      legR: { p: [2.8, 5.4, 0] },
      torso: { p: [0, 5.4, 0] },
    }),
    parts: p,
    anim: 'golem',
    stance: 'heavy',
  };
}

// ---------------------------------------------------------------- Crystal Grotto

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

const BUILD = {
  mossling: () => mossling(),
  bloomling: () => mossling({ body: '#8fcf6a', dark: '#6aa84a', cap: '#3f7d3a', flower: '#ff8fb1' }),
  grubkin,
  gloomcap,
  thornback,
  rootheart,
  shardling,
  glimmerbat,
  rattler,
  geode,
  sentinel,
};

export function enemySpec(id) {
  return BUILD[id]();
}

/**
 * Battle stats at depth 0. attack = animation, melee = walks over to hit.
 * Traits handled in battle.js: thorns, poison, lifesteal, burst (explodes on death), slamAll,
 * summon (boss calls helpers at hp thresholds), shieldSelf, stunHit.
 */
export const ENEMIES = {
  mossling: { name: 'Mossling', hp: 44, atk: 6, spd: 1.6, attack: 'hop', melee: true, scale: 1, size: 0.6 },
  bloomling: { name: 'Bloomling', hp: 52, atk: 5, spd: 1.8, attack: 'hop', melee: true, scale: 1.1, size: 0.6, trait: 'mend' },
  grubkin: { name: 'Grubkin', hp: 58, atk: 8, spd: 1.4, attack: 'slash', melee: true, scale: 0.85, size: 0.6 },
  gloomcap: { name: 'Gloomcap', hp: 48, atk: 6, spd: 2.1, attack: 'cast', melee: false, scale: 1, size: 0.6, trait: 'poison', bolt: '#c99cff' },
  thornback: { name: 'Thornback', hp: 250, atk: 13, spd: 2.0, attack: 'bite', melee: true, scale: 1.45, size: 1.0, trait: 'thorns', elite: true },
  rootheart: { name: 'Old Rootheart', hp: 880, atk: 17, spd: 2.4, attack: 'slam', melee: true, scale: 2.35, size: 1.5, trait: 'summon', boss: true, summon: 'mossling' },
  shardling: { name: 'Shardling', hp: 40, atk: 9, spd: 1.3, attack: 'bite', melee: true, scale: 0.95, size: 0.6, trait: 'burst' },
  glimmerbat: { name: 'Glimmerbat', hp: 42, atk: 7, spd: 1.1, attack: 'dive', melee: true, scale: 0.9, size: 0.6, trait: 'lifesteal' },
  rattler: { name: 'Bone Rattler', hp: 68, atk: 10, spd: 1.6, attack: 'slash', melee: true, scale: 1, size: 0.6 },
  geode: { name: 'Geode Golem', hp: 300, atk: 15, spd: 2.2, attack: 'slam', melee: true, scale: 1.65, size: 1.0, trait: 'stunHit', elite: true },
  sentinel: { name: 'Prism Sentinel', hp: 980, atk: 19, spd: 2.3, attack: 'slam', melee: false, scale: 2.1, size: 1.5, trait: 'shieldSelf', boss: true, bolt: '#9fe3ff' },
};

/** Biomes: palette for the room, enemy pools, elite and boss. */
export const BIOMES = {
  hollow: {
    name: 'Mossy Hollow',
    pools: [['mossling', 'mossling', 'grubkin'], ['grubkin', 'gloomcap', 'mossling'], ['mossling', 'bloomling', 'gloomcap'], ['grubkin', 'grubkin', 'gloomcap', 'mossling']],
    elites: ['thornback'],
    boss: 'rootheart',
    floor: ['#5d7a4a', '#55703f', '#668452'],
    floor2: ['#7a6248', '#6e5840'],
    wall: ['#6f6a5e', '#7a7468', '#655f54'],
    accent: '#ff8fb1',
    light: '#ffd9a0',
    fog: '#2c3a2a',
    sky: ['#1d2b22', '#2f4433', '#4a6248'],
  },
  grotto: {
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
  },
};
