import { box, part, humanBones, humanBody, koStars } from './chars.js';

/*
 * The heroes. Each has a short palette (4-6 colours that sit together), one strong silhouette
 * feature you can read from across the arena, and a weapon that tells you how it fights:
 *   Bulwark  tall crest + tower shield          (tank, front)
 *   Ranger   pointed hood + bow + arrows        (ranged)
 *   Sage     huge crooked hat + glowing staff   (area magic)
 *   Keeper   hair buns + hooked lantern staff   (healer)
 *   Duskblade  spiky hair, mask, long scarf     (fast crits)    recruit
 *   Tinker   goggles + backpack with chimney    (bombs)         recruit
 * Coordinates are px (16 px = 1 unit) on the shared humanoid skeleton in chars.js.
 */

const GOLD = '#f2c14e';

function bulwark(g) {
  const pal = { skin: '#f2c9a0', shirt: '#2f8f8a', sleeve: '#a9b7c6', pants: '#4b5a6e', boots: '#5d6878', belt: '#7a4f2e', gloves: '#8b9aab', blush: '#f0a58a' };
  const steel = '#b3c0ce';
  const steelD = '#7d8b9c';
  const teal = '#2f8f8a';
  const coral = '#ff6b5b';
  const p = humanBody(pal);
  // breastplate over the teal tunic, tabard hanging in front
  p.push(box('torso', 'metal', steel, [0, 9.6, 0.1], [8.6, 5.4, 5.5]));
  p.push(box('torso', 'cloth', teal, [0, 6.6, 2.9], [4.4, 6.4, 0.6]));
  p.push(box('torso', 'metal', g.trim, [0, 3.7, 2.95], [4.4, 0.8, 0.7]));
  p.push(box('torso', 'metal', g.trim, [0, 10.6, 2.95], [1.2, 2.6, 0.5]));
  // pauldrons with brass rims
  for (const [arm, x] of [['armL', -6.1], ['armR', 6.1]]) {
    p.push(box(arm, 'metal', steel, [x, 11.4, 0], [4.4, 2.8, 4.6]));
    p.push(box(arm, 'metal', g.trim, [x, 10.1, 0], [4.6, 0.6, 4.8]));
  }
  // open helmet: shell, cheek guards, back plate, nose guard, brass band
  p.push(box('head', 'metal', steel, [0, 19.3, -0.1], [9.9, 3.6, 8.9]));
  p.push(box('head', 'metal', g.trim, [0, 17.8, 0], [10, 0.8, 9]));
  for (const sx of [-1, 1]) p.push(box('head', 'metal', steelD, [sx * 4.55, 14.9, 0.8], [1.1, 4.2, 6.2]));
  p.push(box('head', 'metal', steelD, [0, 15.2, -3.9], [9.9, 4.6, 1.1]));
  p.push(box('head', 'metal', steel, [0, 16.1, 4.55], [1, 3.2, 0.7]));
  // crest along the top of the helmet: the tank's silhouette
  p.push(box('hat', 'metal', g.trim, [0, 21.4, 0], [1.4, 0.8, 7.5]));
  p.push(box('hat', 'cloth', coral, [0, 23.4, 2.8], [2, 3.4, 2.8]));
  p.push(box('hat', 'cloth', coral, [0, 24.6, 0.1], [2, 5.2, 3]));
  p.push(box('hat', 'cloth', coral, [0, 24.0, -2.7], [2, 4.4, 2.8]));
  p.push(box('hat', 'cloth', '#e0503f', [0, 22.4, -5.0], [1.9, 3.4, 2.4]));
  p.push(box('hat', 'cloth', '#e0503f', [0, 20.6, -6.4], [1.8, 2.6, 1.8]));
  // sword (right hand)
  p.push(box('handR', 'leather', '#6b4428', [5.3, 6, 0.4], [1.2, 2.8, 1.2]));
  p.push(box('handR', 'metal', g.trim, [5.3, 4.3, 0.4], [1.6, 1.1, 1.6]));
  p.push(box('handR', 'metal', g.trim, [5.3, 7.7, 0.4], [4.4, 1, 1.3]));
  p.push(box('handR', 'metal', g.blade, [5.3, 12.4, 0.4], [1.7, 8.4, 0.7]));
  p.push(box('handR', 'metal', g.blade, [5.3, 17.1, 0.4], [1.0, 1.2, 0.6]));
  if (g.glow) p.push(box('handR', 'magic', g.glow, [5.3, 12.4, 0.4], [0.5, 7.4, 0.8]));
  // tower shield (left hand), turned a little outward; authored around its own centre
  const sh = [];
  sh.push(box('shield', 'wood', teal, [0, 0, 0], [8.2, 10.4, 1.2]));
  sh.push(box('shield', 'metal', steelD, [0, 5.0, 0], [8.8, 0.9, 1.6]));
  sh.push(box('shield', 'metal', steelD, [0, -5.0, 0], [8.8, 0.9, 1.6]));
  sh.push(box('shield', 'metal', steelD, [4.2, 0, 0], [0.9, 10.4, 1.6]));
  sh.push(box('shield', 'metal', steelD, [-4.2, 0, 0], [0.9, 10.4, 1.6]));
  sh.push(box('shield', 'metal', g.trim, [0, 0.4, 0.7], [1.2, 6.4, 0.5]));
  sh.push(box('shield', 'metal', g.trim, [0, 1.6, 0.7], [5.2, 1.2, 0.5]));
  sh.push(part('shield', 'orb', 'metal', g.trim, [0, 1.6, 1.0], [2.2, 2.2, 1.2]));
    for (const q of sh) q.o = [q.o[0] - 6.6, q.o[1] + 7.2, q.o[2] + 3.0];
  p.push(...sh);
  p.push(...koStars(22));
  return {
    bones: humanBones({ handR: { rest: [0.45, 0, 0] }, shield: { parent: 'handL', p: [-6.6, 7.2, 3.0], rest: [0, -0.55, 0] } }),
    parts: p,
    anim: 'human',
    stance: 'heavy',
    shieldUp: true,
  };
}

function ranger(g) {
  const pal = { skin: '#e8b48c', shirt: '#a4683f', sleeve: '#7d4f30', pants: '#5b4a3a', boots: '#4a3426', belt: '#3b2a1e', gloves: '#6b4428', blush: '#e08f72' };
  const green = '#3f7d4e';
  const greenL = '#5e9e5a';
  const greenD = '#2e5e3b';
  const hair = '#b5562f';
  const p = humanBody(pal);
  // fringe under the hood
  p.push(box('head', 'cloth', hair, [0, 18.9, 4.1], [8.2, 1.6, 0.8]));
  p.push(box('head', 'cloth', hair, [-3.4, 17.6, 4.1], [1.6, 2.6, 0.8]));
  // hood: shell, sides, back, rim, and the long point that falls behind
  p.push(box('head', 'cloth', green, [0, 19.9, -0.3], [9.9, 2.4, 9.1]));
  for (const sx of [-1, 1]) p.push(box('head', 'cloth', green, [sx * 4.65, 16.3, -0.4], [0.9, 6.4, 8.3]));
  p.push(box('head', 'cloth', green, [0, 16.0, -4.35], [9.9, 7.4, 1]));
  p.push(box('head', 'cloth', greenL, [0, 20.4, 4.1], [10, 1.2, 1.1]));
  p.push(box('head', 'cloth', green, [0, 21.4, -1.2], [7, 1.2, 6.4]));
  p.push(box('hat', 'cloth', green, [0, 20.2, -5.3], [5, 3.6, 2.6]));
  p.push(box('hat', 'cloth', green, [0, 18.8, -7.2], [3.2, 2.6, 2.4]));
  p.push(box('hat', 'cloth', greenD, [0, 17.3, -8.6], [1.8, 1.8, 1.8]));
  // capelet + cloak
  p.push(box('torso', 'cloth', green, [0, 11.0, 0], [9.6, 2.2, 6.2]));
  p.push(box('torso', 'cloth', greenL, [0, 10.0, 3.0], [3.0, 1.6, 0.6]));
  p.push(box('cape', 'cloth', green, [0, 7.4, -3.3], [9.2, 8.4, 0.9]));
  p.push(box('cape', 'cloth', greenD, [0, 2.8, -3.4], [9.4, 1.2, 1.0]));
  // quiver with orange fletching over the right shoulder
  p.push(box('torso', 'leather', '#8a5a33', [2.2, 9.6, -3.4], [2.6, 6.2, 2.6], [0, 0, -0.35]));
  p.push(box('torso', 'cloth', '#ff9a3c', [3.6, 13.6, -3.4], [1, 1.8, 1]));
  p.push(box('torso', 'cloth', '#efe2c4', [4.4, 13.0, -2.8], [1, 1.6, 1]));
  p.push(box('torso', 'cloth', '#ff9a3c', [3.0, 14.2, -4.0], [1, 1.6, 1]));
  // bow (left hand), stays upright: grip, two curved limbs, string
  const bx = -5.3;
  p.push(box('bow', 'leather', '#6b4428', [bx, 6, 1.4], [1.3, 2.2, 1.3]));
  p.push(box('bow', 'wood', g.bow, [bx, 8.9, 1.8], [1.1, 3.6, 1.1]));
  p.push(box('bow', 'wood', g.bow, [bx, 11.6, 1.0], [1.0, 2.4, 1.0]));
  p.push(box('bow', 'wood', g.bow, [bx, 3.1, 1.8], [1.1, 3.6, 1.1]));
  p.push(box('bow', 'wood', g.bow, [bx, 0.4, 1.0], [1.0, 2.4, 1.0]));
  p.push(box('bow', 'cloth', '#efe2c4', [bx, 6, 0.55], [0.3, 12.6, 0.3]));
  if (g.glow) p.push(part('bow', 'orb', 'magic', g.glow, [bx, 6, 2.3], [1.4, 1.4, 1.4]));
  p.push(...koStars(22));
  return {
    bones: humanBones({ bow: { parent: 'handL', p: [-5.3, 6, 0.4] } }),
    parts: p,
    anim: 'human',
  };
}

function sage(g) {
  const pal = { skin: '#f6dcc5', shirt: '#5b3c8c', sleeve: '#5b3c8c', pants: '#3e2766', boots: '#3a2a4a', blush: '#f3a7a0' };
  const robe = '#5b3c8c';
  const robeD = '#3e2766';
  const beard = '#f1ece2';
  const p = humanBody(pal, { robe: true });
  // long robe skirt (on the root so it stays put), gold hem + front trim
  p.push(box('root', 'cloth', robe, [0, 3.4, 0], [9.4, 5.6, 6.4]));
  p.push(box('root', 'cloth', GOLD, [0, 0.9, 0], [9.8, 0.9, 6.8]));
  p.push(box('torso', 'cloth', GOLD, [0, 7.6, 2.75], [1.2, 6.2, 0.5]));
  // wide sleeves with gold cuffs
  for (const [arm, x] of [['armL', -5.5], ['armR', 5.5]]) {
    p.push(box(arm, 'cloth', robe, [x, 8.9, 0], [3.4, 5, 3.6]));
    p.push(box(arm, 'cloth', GOLD, [x, 6.9, 0], [3.6, 0.8, 3.8]));
  }
  // beard + moustache + side hair
  p.push(box('head', 'fur', beard, [0, 12.6, 4.0], [6.6, 3.4, 1.6]));
  p.push(box('head', 'fur', beard, [0, 10.4, 3.6], [4.2, 2.2, 1.4]));
  p.push(box('head', 'fur', beard, [0, 14.0, 4.5], [4.6, 1, 0.8]));
  for (const sx of [-1, 1]) p.push(box('head', 'fur', beard, [sx * 4.6, 15.8, -0.6], [0.8, 3.2, 6]));
  // the hat: wide brim, gold band with a little star, a crown that bends backwards
  p.push(box('hat', 'cloth', robeD, [0, 20.3, 0], [15, 1, 14]));
  p.push(box('hat', 'cloth', GOLD, [0, 21.3, 0], [9.6, 1.2, 9.2]));
  p.push(box('hat', 'cloth', robe, [0, 23.3, -0.3], [9, 3, 8.6]));
  p.push(box('hat', 'cloth', robe, [0, 25.8, -1.1], [7, 2.4, 6.6]));
  p.push(box('hat', 'cloth', robe, [0, 27.7, -2.4], [5, 2, 5]));
  p.push(box('hat', 'cloth', robe, [0, 29.1, -4.0], [3.4, 1.8, 3.4]));
  p.push(box('hat', 'cloth', robeD, [0, 29.7, -5.8], [2.1, 1.6, 2.2]));
  p.push(part('hat', 'orb', 'magic', g.glow || '#ffd34d', [0, 21.3, 4.75], [1.5, 1.5, 0.8]));
  // staff with a glowing orb in a wooden claw
  p.push(box('handR', 'wood', '#8a5a33', [5.3, 11.6, 0.4], [1.2, 24.4, 1.2]));
  p.push(box('handR', 'metal', GOLD, [5.3, 23.2, 0.4], [1.8, 0.8, 1.8]));
  p.push(box('handR', 'wood', '#8a5a33', [5.3, 25.4, 1.8], [1, 2.6, 1], [0.35, 0, 0]));
  p.push(box('handR', 'wood', '#8a5a33', [5.3, 25.4, -1.0], [1, 2.6, 1], [-0.35, 0, 0]));
  p.push(part('handR', 'orb', 'magic', g.orb, [5.3, 26.6, 0.4], [3.6, 3.6, 3.6]));
  p.push(...koStars(32));
  return {
    bones: humanBones({ handR: { rest: [0.12, 0, 0] } }),
    parts: p,
    anim: 'human',
  };
}

function keeper(g) {
  const pal = { skin: '#c68863', shirt: '#f6f0e4', sleeve: '#f6f0e4', pants: '#d8cfbd', boots: '#8a6a4a', blush: '#b8675a' };
  const cream = '#f6f0e4';
  const sky = '#7cc4e8';
  const skyD = '#4f97c4';
  const hair = '#2b1d14';
  const p = humanBody(pal, { robe: true });
  p.push(box('root', 'cloth', cream, [0, 3.4, 0], [9.4, 5.6, 6.4]));
  p.push(box('root', 'cloth', sky, [0, 0.9, 0], [9.8, 0.9, 6.8]));
  // sky mantle + stole with gold tips
  p.push(box('torso', 'cloth', sky, [0, 10.7, 0.1], [9.2, 2.6, 5.9]));
  for (const sx of [-1, 1]) {
    p.push(box('torso', 'cloth', skyD, [sx * 1.8, 7.4, 2.8], [1.4, 6, 0.5]));
    p.push(box('torso', 'cloth', GOLD, [sx * 1.8, 4.2, 2.8], [1.5, 0.8, 0.6]));
  }
  for (const [arm, x] of [['armL', -5.4], ['armR', 5.4]]) {
    p.push(box(arm, 'cloth', cream, [x, 8.9, 0], [3.2, 4.8, 3.4]));
    p.push(box(arm, 'cloth', sky, [x, 7.0, 0], [3.4, 0.8, 3.6]));
  }
  // hair: cap, back, sides, fringe, two buns; gold circlet with a glowing gem
  p.push(box('head', 'fur', hair, [0, 20.2, -0.3], [9.4, 1.4, 8.6]));
  p.push(box('head', 'fur', hair, [0, 16.4, -3.9], [9.4, 7.4, 1.2]));
  for (const sx of [-1, 1]) p.push(box('head', 'fur', hair, [sx * 4.55, 16.8, -0.3], [0.9, 5.4, 7.4]));
  p.push(box('head', 'fur', hair, [-1.6, 19.2, 4.15], [5.4, 1.8, 0.8]));
  p.push(box('head', 'fur', hair, [2.6, 19.4, 4.15], [3.2, 1.4, 0.8]));
  for (const sx of [-1, 1]) {
    p.push(part('hat', 'orb', 'fur', hair, [sx * 4.4, 21.6, -1.2], [4.6, 4.6, 4.6]));
    p.push(box('hat', 'cloth', sky, [sx * 3.4, 20.6, 0.4], [1.6, 1.2, 1.6]));
  }
  p.push(box('head', 'metal', GOLD, [0, 18.4, 0.2], [9.8, 0.8, 8.9]));
  p.push(part('head', 'orb', 'magic', '#9fe3ff', [0, 18.4, 4.7], [1.3, 1.3, 0.8]));
  // hooked staff with a hanging lantern
  p.push(box('handR', 'wood', '#a87a4a', [5.3, 9.6, 0.4], [1.1, 19, 1.1]));
  p.push(box('handR', 'wood', '#a87a4a', [5.3, 19.5, 1.5], [1, 1, 3.2]));
  p.push(box('handR', 'wood', '#a87a4a', [5.3, 18.7, 2.9], [1, 1.6, 1]));
  p.push(box('lantern', 'metal', GOLD, [5.3, 16.9, 2.9], [2.6, 0.6, 2.6]));
  p.push(box('lantern', 'magic', g.glow || '#ffd27a', [5.3, 15.6, 2.9], [2.0, 2.2, 2.0]));
  p.push(box('lantern', 'metal', GOLD, [5.3, 14.3, 2.9], [2.6, 0.6, 2.6]));
  for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) p.push(box('lantern', 'metal', GOLD, [5.3 + dx, 15.6, 2.9 + dz], [0.4, 2.2, 0.4]));
  p.push(...koStars(24));
  return {
    bones: humanBones({ handR: { rest: [0.12, 0, 0] }, lantern: { parent: 'handR', p: [5.3, 18.0, 2.9] } }),
    parts: p,
    anim: 'human',
  };
}

function duskblade(g) {
  const pal = { skin: '#f3d2b3', shirt: '#3b3f55', sleeve: '#3b3f55', pants: '#2d3044', boots: '#22243a', belt: '#7a4a8c', gloves: '#2a2c3e', eye: '#2a2238' };
  const mint = '#6fe0c0';
  const hair = '#e8e4f0';
  const p = humanBody(pal);
  // mask over the lower face
  p.push(box('head', 'cloth', '#2a2c3e', [0, 13.5, 4.25], [9.2, 2.6, 0.6]));
  // spiky silver hair
  p.push(box('head', 'fur', hair, [0, 20.4, -0.3], [9.4, 1.6, 8.6]));
  p.push(box('head', 'fur', hair, [0, 17.2, -3.95], [9.4, 6.8, 1.2]));
  for (const sx of [-1, 1]) p.push(box('head', 'fur', hair, [sx * 4.55, 17.6, -0.6], [0.9, 4.4, 7]));
  p.push(box('head', 'fur', hair, [-1.2, 19.3, 4.15], [6.4, 1.6, 0.8]));
  p.push(box('head', 'fur', hair, [2.8, 18.6, 4.15], [2.2, 2.6, 0.8]));
  for (const [x, y, z, h2, rx, rz] of [[-3, 22.2, 0.8, 4.4, 0.2, 0.55], [0.2, 23.0, -0.4, 5.4, -0.15, 0.05], [3.2, 22.0, 0.4, 4.2, 0.1, -0.6], [-1.6, 21.6, -3.4, 4.2, -0.7, 0.3], [2.0, 21.4, -3.2, 4.0, -0.7, -0.35], [0, 19.4, -5.2, 3.6, -1.3, 0]])
    p.push(part('hat', 'spire', 'fur', hair, [x, y, z], [3.4, h2, 3.4], [rx, 0, rz]));
  // mint scarf wrapped round the neck, tails streaming behind
  p.push(box('torso', 'cloth', mint, [0, 11.8, 0.2], [9.4, 2.2, 6.2]));
  p.push(box('cape', 'cloth', mint, [1.4, 10.4, -3.6], [2.6, 3.0, 0.9]));
  p.push(box('cape', 'cloth', mint, [3.0, 9.2, -5.6], [2.4, 1.0, 3.6], [0, 0.5, -0.2]));
  p.push(box('cape', 'cloth', mint, [5.0, 8.2, -8.2], [2.2, 0.9, 3.4], [0, 0.7, -0.35]));
  p.push(box('cape', 'cloth', '#4fc0a2', [6.8, 7.0, -10.4], [1.9, 0.8, 2.6], [0, 0.85, -0.5]));
  // belt pouch + chest strap
  p.push(box('torso', 'leather', '#7a4a8c', [-2.6, 5.6, 2.6], [2.2, 2, 1.2]));
  p.push(box('torso', 'leather', '#7a4a8c', [0, 9.0, 2.6], [8.2, 1, 0.4], [0, 0, 0.6]));
  // twin daggers
  for (const [hand, x] of [['handL', -5.3], ['handR', 5.3]]) {
    p.push(box(hand, 'leather', '#7a4a8c', [x, 6, 0.4], [1.1, 2.2, 1.1]));
    p.push(box(hand, 'metal', '#9aa2ad', [x, 7.3, 0.4], [2.4, 0.7, 1.1]));
    p.push(box(hand, 'metal', g.blade, [x, 9.8, 0.4], [1.2, 4.4, 0.5]));
    if (g.glow) p.push(box(hand, 'magic', g.glow, [x, 9.8, 0.4], [0.4, 3.6, 0.6]));
  }
  p.push(...koStars(24));
  return {
    bones: humanBones({ handR: { rest: [0.35, 0, 0.25] }, handL: { rest: [0.35, 0, -0.25] } }),
    parts: p,
    anim: 'human',
    stance: 'crouch',
  };
}

function tinker(g) {
  const pal = { skin: '#8d5a3b', shirt: '#efe2c4', sleeve: '#efe2c4', pants: '#6b4a2f', boots: '#4a3426', belt: '#5a3a22', gloves: '#a0522d', blush: '#7a4530' };
  const mustard = '#e8b23a';
  const rust = '#c4552f';
  const brass = '#d9a441';
  const p = humanBody(pal);
  // overall bib + straps
  p.push(box('torso', 'cloth', mustard, [0, 7.4, 2.7], [6, 4.6, 0.6]));
  for (const sx of [-1, 1]) p.push(box('torso', 'cloth', mustard, [sx * 2.4, 10.6, 2.6], [1.2, 2.4, 0.5]));
  for (const leg of ['legL', 'legR']) p.push(box(leg, 'cloth', mustard, [leg === 'legL' ? -2 : 2, 3.6, 0], [3.6, 3.6, 3.6]));
  // backpack with brass bands and a little chimney
  p.push(box('torso', 'metal', rust, [0, 9.4, -4.4], [7.4, 7.4, 3.8]));
  p.push(box('torso', 'metal', brass, [0, 11.2, -4.4], [7.6, 0.8, 4]));
  p.push(box('torso', 'metal', brass, [0, 7.4, -4.4], [7.6, 0.8, 4]));
  p.push(box('torso', 'metal', '#4a4f5a', [2.4, 15.0, -5.0], [1.6, 4.2, 1.6]));
  p.push(box('torso', 'metal', '#3a3f4a', [2.4, 17.3, -5.0], [2.4, 0.8, 2.4]));
  p.push(part('torso', 'orb', 'magic', g.glow || '#ff9a3c', [-2.2, 9.6, -6.4], [1.6, 1.6, 1.0]));
  // short curly hair + goggles on the forehead
  p.push(box('head', 'fur', '#2b1d14', [0, 20.4, -0.3], [9.6, 1.8, 8.8]));
  p.push(box('head', 'fur', '#2b1d14', [0, 16.8, -3.95], [9.4, 7, 1.2]));
  for (const sx of [-1, 1]) p.push(box('head', 'fur', '#2b1d14', [sx * 4.55, 17.6, -0.8], [0.9, 4, 6.6]));
  p.push(box('head', 'leather', '#3a2a20', [0, 18.6, 0.2], [9.9, 1.3, 9.0]));
  for (const sx of [-1, 1]) {
    p.push(box('head', 'metal', brass, [sx * 2.1, 18.9, 4.55], [3.0, 2.8, 1.0]));
    p.push(box('head', 'magic', '#7fe0ff', [sx * 2.1, 18.9, 5.05], [2.0, 1.8, 0.4]));
  }
  // big wrench
  p.push(box('handR', 'metal', '#8b96a3', [5.3, 8.6, 0.4], [1.2, 7.2, 1.2]));
  p.push(box('handR', 'metal', '#8b96a3', [5.3, 12.6, 0.4], [3.6, 1.6, 1.4]));
  p.push(box('handR', 'metal', '#8b96a3', [4.0, 14.0, 0.4], [1.0, 1.8, 1.4]));
  p.push(box('handR', 'metal', '#8b96a3', [6.6, 14.0, 0.4], [1.0, 1.8, 1.4]));
  p.push(box('handR', 'metal', g.trim, [5.3, 6.2, 0.4], [1.5, 1.2, 1.5]));
  p.push(...koStars(24));
  return {
    bones: humanBones({ handR: { rest: [0.5, 0, 0] } }),
    parts: p,
    anim: 'human',
  };
}

const BUILD = { bulwark, ranger, sage, keeper, duskblade, tinker };

/**
 * Gear tiers show on the model: tier 0 plain steel, 1 polished with gold trim, 2 a glowing edge.
 * Returns the spec for a hero at a gear tier.
 */
/**
 * charm = the worn trinket, drawn as a little charm hanging from the right hip:
 * { color, rank } (rank 0 common .. 5 mythic; rare and up glow, mythics get a spark on top).
 */
function charmParts(charm) {
  if (!charm) return [];
  const glow = charm.rank >= 2;
  const out = [
    box('torso', 'leather', '#3a2e24', [2.9, 5.2, 3.05], [0.4, 1.2, 0.4]),
    box('torso', glow ? 'magic' : 'metal', charm.color, [2.9, 4.0, 3.1], [1.8, 1.8, 0.7], [0, 0, 0.785]),
  ];
  if (charm.rank >= 4) out.push(box('torso', 'magic', '#ffffff', [2.9, 4.1, 3.5], [0.6, 0.6, 0.2], [0, 0, 0.785]));
  if (charm.rank >= 5) out.push(part('torso', 'orb', 'magic', '#fff3c4', [2.9, 2.8, 3.1], [0.7, 0.7, 0.7]));
  return out;
}

export function heroSpec(id, tier = 0, charm = null) {
  const g = {
    trim: tier >= 1 ? '#ffd34d' : '#d9a441',
    blade: tier >= 1 ? '#eef5fb' : '#c9d3dd',
    bow: tier >= 1 ? '#a8693a' : '#8a5a33',
    glow: tier >= 2 ? HEROES[id].glow : null,
    orb: tier >= 2 ? '#ffe08a' : '#ffb347',
  };
  const spec = BUILD[id](g);
  if (charm) spec.parts = [...spec.parts, ...charmParts(charm)];
  return spec;
}

/**
 * Battle stats. atk = damage per hit, spd = seconds between actions, role decides where they stand.
 * skill = every Nth action does something special (see battle.js).
 */
export const HEROES = {
  bulwark: { id: 'bulwark', name: 'Bram', cls: 'Bulwark', role: 'front', hp: 190, atk: 11, spd: 1.55, attack: 'slash', skillEvery: 4, glow: '#7fe0ff', color: '#2f8f8a', blurb: 'Holds the line. Enemies go for Bram first; every 4th swing is a shield bash that stuns.' },
  ranger: { id: 'ranger', name: 'Wren', cls: 'Ranger', role: 'back', hp: 110, atk: 13, spd: 1.25, attack: 'shoot', skillEvery: 3, glow: '#a6ff7a', color: '#3f7d4e', blurb: 'Steady arrows from the back row. Every 3rd shot is a twin shot.' },
  sage: { id: 'sage', name: 'Odo', cls: 'Sage', role: 'back', hp: 95, atk: 15, spd: 2.0, attack: 'cast', skillEvery: 3, glow: '#ffe08a', color: '#5b3c8c', blurb: 'Slow, heavy sparks. Every 3rd cast bursts over every enemy.' },
  keeper: { id: 'keeper', name: 'Lumi', cls: 'Keeper', role: 'back', hp: 105, atk: 8, spd: 1.6, attack: 'heal', skillEvery: 4, glow: '#ffe7a8', color: '#7cc4e8', blurb: 'Mends whoever is hurt most; tosses little lights when nobody is. Every 4th: a warm glow heals everyone.' },
  duskblade: { id: 'duskblade', name: 'Vex', cls: 'Duskblade', role: 'front', hp: 125, atk: 9, spd: 0.85, attack: 'stab', skillEvery: 3, glow: '#6fe0c0', color: '#6fe0c0', blurb: 'Quick twin daggers and frequent crits. Every 3rd strike finds the weakest enemy.' },
  tinker: { id: 'tinker', name: 'Pip', cls: 'Tinker', role: 'back', hp: 115, atk: 12, spd: 1.8, attack: 'throw', skillEvery: 4, glow: '#ff9a3c', color: '#e8b23a', blurb: 'Lobs bombs that splash nearby enemies. Every 4th is a big one that leaves them burning.' },
};

export const STARTERS = ['bulwark', 'ranger', 'sage', 'keeper'];
export const RECRUITS = { duskblade: 60, tinker: 80 };
