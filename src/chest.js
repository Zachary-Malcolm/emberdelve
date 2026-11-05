import { box } from './chars.js';

/*
 * Loot chest built on the character rig: a body, a lid on a hinge bone at the back edge, and a
 * glowing tray inside that shows the colour of the best item. It drops in like a character,
 * rattles, then the lid flings open with a springy overshoot.
 *
 * kind 'elite' = oak and iron, 'boss' = dark wood and gold.
 */
export function chestSpec(kind, glow = '#ffd36b') {
  const boss = kind === 'boss';
  const wood = boss ? '#6e3a2c' : '#9a6235';
  const plank = boss ? '#5a2e23' : '#7d4c28';
  const trim = boss ? '#e8b84a' : '#566070';
  const lock = boss ? '#fff0b0' : '#ffcf45';
  const parts = [
    // body
    box('root', 'wood', wood, [0, 5, 0], [16, 10, 11]),
    box('root', 'wood', plank, [0, 3.4, 0], [16.3, 0.8, 11.3]),
    box('root', 'wood', plank, [0, 6.8, 0], [16.3, 0.8, 11.3]),
    box('root', 'metal', trim, [0, 0.6, 0], [16.8, 1.2, 11.8]),
    box('root', 'metal', trim, [-5.2, 5, 0], [1.7, 10.4, 11.5]),
    box('root', 'metal', trim, [5.2, 5, 0], [1.7, 10.4, 11.5]),
    box('root', 'metal', trim, [-7.6, 0.9, 5.3], [1.6, 1.8, 1.6]),
    box('root', 'metal', trim, [7.6, 0.9, 5.3], [1.6, 1.8, 1.6]),
    // the glowing loot inside (hidden under the lid until it opens)
    box('glow', 'magic', glow, [0, 9.7, 0], [13.6, 0.8, 8.6]),
    box('glow', 'magic', glow, [-3, 10.3, -1], [2.2, 1.6, 2.2]),
    box('glow', 'magic', glow, [2.5, 10.4, 1], [1.8, 1.8, 1.8]),
    // lock plate on the body front
    box('root', 'metal', lock, [0, 8.4, 5.8], [3.2, 3.4, 1]),
    box('root', 'metal', '#2a2230', [0, 8.1, 6.35], [0.8, 1.4, 0.3]),
    // lid (hinged at the back top edge)
    box('lid', 'metal', trim, [0, 10.45, 0], [16.8, 0.9, 11.8]),
    box('lid', 'wood', wood, [0, 12.6, 0], [16, 3.6, 11]),
    box('lid', 'wood', wood, [0, 14.9, 0], [15, 1.4, 9.6]),
    box('lid', 'metal', trim, [-5.2, 13.1, 0], [1.7, 4.8, 11.5]),
    box('lid', 'metal', trim, [5.2, 13.1, 0], [1.7, 4.8, 11.5]),
    box('lid', 'metal', trim, [-5.2, 15.1, 0], [1.7, 1.2, 9.9]),
    box('lid', 'metal', trim, [5.2, 15.1, 0], [1.7, 1.2, 9.9]),
    box('lid', 'metal', lock, [0, 11.2, 5.95], [2.4, 1.6, 0.8]),
  ];
  if (boss) {
    // a little crown of gold studs on the lid
    for (const x of [-2.6, 0, 2.6]) parts.push(box('lid', 'metal', '#ffe27a', [x, 16, 0], [1.4, 1, 1.4]));
  }
  return {
    bones: {
      root: { p: [0, 0, 0] },
      glow: { parent: 'root', p: [0, 9.6, 0] },
      lid: { parent: 'root', p: [0, 10, -5.6] },
    },
    parts,
    animate: chestAnim,
  };
}

/** Pose: idle hop while closed; once `c.openAt` is set: rattle, then the lid flings open. */
function chestAnim(c, P) {
  const r = (P.root = {});
  const lid = (P.lid = {});
  const glow = (P.glow = {});
  if (c.openAt == null) {
    // a hopeful little hop every couple of seconds
    const h = (c.t % 1.8) / 1.8;
    if (h > 0.82) {
      const k = (h - 0.82) / 0.18;
      r.dy = Math.sin(k * Math.PI) * 1.6;
      lid.rx = -Math.sin(k * Math.PI) * 0.12;
    }
    glow.sy = 0.2;
    return;
  }
  const t = c.t - c.openAt;
  const shake = 0.7;
  if (t < shake) {
    const k = t / shake;
    r.rz = Math.sin(t * 46) * 0.07 * k;
    r.sy = 1 - 0.1 * k;
    r.sx = r.sz = 1 + 0.05 * k;
    lid.rx = -Math.max(0, Math.sin(t * 31)) * 0.1 * k;
    glow.sy = 0.2;
  } else {
    const u = t - shake;
    lid.rx = -1.95 * (1 - Math.exp(-9 * u) * Math.cos(13 * u));
    const pop = Math.exp(-8 * u) * Math.cos(16 * u);
    r.sy = 1 + 0.16 * pop;
    r.sx = r.sz = 1 - 0.07 * pop;
    glow.sy = 1 + 0.25 * Math.sin(c.t * 5);
    glow.dy = 0.4 * Math.sin(c.t * 2.5);
  }
}
