import * as THREE from 'three';
import { geometryFor } from './kit.js';

/*
 * Voxel characters: part-based rigs drawn into a shared MultiBatch.
 *
 * Proportion system (see CLAUDE.md): everything is authored in "px" where 16 px = 1 world unit.
 * A standard hero is 20 px to the crown (feet 0, hips 5, shoulders 11, neck 12, head 12..20),
 * head 9x8x8, torso 8x7x5, arms 3 wide, legs 3.4 wide. Hats and weapons stick out of that box
 * to make the silhouette. Enemies use the same px grid with their own body plans and a scale.
 *
 * Model space faces +z. Bones have a pivot `p` (absolute px in rest pose) and an optional rest
 * rotation; parts are boxes (or kit shapes) at an absolute px centre `o` with a px size `s`.
 * The animator writes a pose per frame: { bone: { rx, ry, rz, dx, dy, dz, sx, sy, sz } }.
 */

export const PX = 1 / 16;

// bounding size of each kit shape at scale 1, so `s` can always be given as the size in px
const NORM = {
  cube: [1, 1, 1],
  orb: [0.6, 0.6, 0.6],
  cone: [1.24, 1, 1.24],
  spire: [0.92, 1, 0.92],
  pillar: [0.8, 1, 0.8],
  blob: [1.28, 1.28, 1.28],
  dome: [1.06, 1, 1.06],
  wedge: [1, 1, 1],
  corner: [1, 1, 1],
  post: [0.3, 1, 0.3],
  rock: [1.2, 0.96, 1.2],
  logx: [1, 0.84, 0.84],
};

const MAT_ALIAS = { cloth: 'fabric', wood: 'grain' };

const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const WHITE = new THREE.Color('#ffffff');
const Y = new THREE.Vector3(0, 1, 0);

/** Shorthand used by the character files: a box part on a bone. */
export const box = (bone, mat, color, o, s, rot) => ({ bone, shape: 'cube', mat, color, o, s, rot });
export const part = (bone, shape, mat, color, o, s, rot) => ({ bone, shape, mat, color, o, s, rot });

/** Standard humanoid skeleton (see the proportion notes above). */
export function humanBones(extra = {}) {
  const b = {
    root: { p: [0, 0, 0] },
    legL: { parent: 'root', p: [-2, 5, 0] },
    legR: { parent: 'root', p: [2, 5, 0] },
    torso: { parent: 'root', p: [0, 5, 0] },
    head: { parent: 'torso', p: [0, 12, 0] },
    eyes: { parent: 'head', p: [0, 15.5, 4.3] },
    armL: { parent: 'torso', p: [-5.3, 11, 0] },
    armR: { parent: 'torso', p: [5.3, 11, 0] },
    handL: { parent: 'armL', p: [-5.3, 6, 0.4] },
    handR: { parent: 'armR', p: [5.3, 6, 0.4] },
    cape: { parent: 'torso', p: [0, 11.5, -2.8] },
    hat: { parent: 'head', p: [0, 20, 0] },
    fx: { parent: 'root', p: [0, 0, 0] },
  };
  for (const [k, v] of Object.entries(extra)) b[k] = { ...(b[k] || {}), ...v };
  return b;
}

/** Eyes with a highlight in the upper-left (light always comes from the same side). */
export function eyes(color = '#2a2238', { x = 2.1, y = 15.5, z = 4.3, w = 1.3, h = 2.3, glow = false, bone = 'eyes', shine = true } = {}) {
  const out = [];
  for (const sx of [-1, 1]) {
    out.push(box(bone, glow ? 'magic' : 'eye', color, [sx * x, y, z], [w, h, 0.5]));
    if (shine && !glow) out.push(box(bone, 'eye', '#ffffff', [sx * x - 0.28, y + h * 0.28, z + 0.22], [w * 0.45, w * 0.45, 0.3]));
  }
  return out;
}

/**
 * The shared humanoid body: legs + boots, torso, belt, head, arms + hands.
 * pal: { skin, shirt, sleeve?, pants, boots, belt?, gloves?, eye? }   o: { robe, noLegs }
 */
export function humanBody(pal, o = {}) {
  const p = [];
  for (const [side, x] of [['L', -2], ['R', 2]]) {
    if (!o.robe) p.push(box('leg' + side, 'cloth', pal.pants, [x, 3.3, 0], [3.4, 4, 3.4]));
    p.push(box('leg' + side, 'leather', pal.boots, o.robe ? [x, 0.75, 1.0] : [x, 1.1, 0.35], o.robe ? [3.2, 1.5, 3.6] : [3.8, 2.2, 4.3]));
  }
  p.push(box('torso', 'cloth', pal.shirt, [0, 8.6, 0], [8, 7.2, 5]));
  if (pal.belt) p.push(box('torso', 'leather', pal.belt, [0, 5.9, 0], [8.4, 1.3, 5.4]));
  p.push(box('head', 'skin', pal.skin, [0, 16, 0.2], [9, 8, 8]));
  p.push(box('head', 'skin', pal.skin, [0, 12.6, 0], [3.4, 1.4, 3])); // neck
  p.push(...eyes(pal.eye || '#2a2238'));
  if (pal.blush) for (const sx of [-1, 1]) p.push(box('head', 'skin', pal.blush, [sx * 3.1, 14.0, 4.3], [1.6, 0.9, 0.3]));
  for (const [side, x] of [['L', -5.3], ['R', 5.3]]) {
    p.push(box('arm' + side, 'cloth', pal.sleeve || pal.shirt, [x, 9, 0], [2.8, 4.6, 3]));
    p.push(box('arm' + side, pal.gloves ? 'leather' : 'skin', pal.gloves || pal.skin, [x, 6.1, 0.1], [2.6, 2.4, 2.8]));
  }
  return p;
}

// ---------------------------------------------------------------- the rig

const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const ease = (x) => {
  x = clamp01(x);
  return x * x * (3 - 2 * x);
};
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = (x) => Math.pow(clamp01(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;

export class Character {
  /**
   * spec: { bones, parts, anim: 'human' | 'blob' | 'bug' | 'flyer' | 'golem', scale, attack, stance }
   * batch: a MultiBatch the parts are drawn into.
   */
  constructor(batch, spec, { scale = 1, phase = Math.random() * 10 } = {}) {
    this.batch = batch;
    this.spec = spec;
    this.scale = (spec.scale || 1) * scale;
    this.phase = phase;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.t = 0;
    this.action = null;
    this.moving = false;
    this.walkT = 0;
    this.hurtT = 9;
    this.flash = 0;
    this.flashShown = 0;
    this.tint = null;
    this.ko = false;
    this.koT = 0;
    this.spawnT = 9;
    this.dead = false;
    this.visible = true;
    this.blinkAt = 1 + Math.random() * 3;
    this.lift = 0;

    const names = Object.keys(spec.bones);
    const order = [];
    const seen = new Set();
    const visit = (n) => {
      if (seen.has(n)) return;
      const par = spec.bones[n].parent;
      if (par) visit(par);
      seen.add(n);
      order.push(n);
    };
    names.forEach(visit);
    this.bones = order.map((n) => {
      const d = spec.bones[n];
      return { name: n, parent: d.parent || null, p: d.p.slice(), rest: d.rest || [0, 0, 0], world: new THREE.Matrix4() };
    });
    this.boneOf = Object.fromEntries(this.bones.map((b) => [b.name, b]));

    this.parts = spec.parts
      .filter((p) => this.boneOf[p.bone])
      .map((p) => {
        const shape = p.shape || 'cube';
        const n = NORM[shape] || NORM.cube;
        const local = new THREE.Matrix4().compose(
          _v.set(...p.o),
          p.rot ? new THREE.Quaternion().setFromEuler(_e.set(p.rot[0], p.rot[1], p.rot[2])) : new THREE.Quaternion(),
          _s.set(p.s[0] / n[0], p.s[1] / n[1], p.s[2] / n[2]),
        );
        const color = new THREE.Color(p.color);
        const mat = MAT_ALIAS[p.mat] || p.mat; // small parts read cleaner with quieter textures
        const h = batch.add({ shape, mat }, 0, -500, 0, 0.0001, 0.0001, 0.0001, null, color);
        return { ...p, shape, local, color, h, bone: this.boneOf[p.bone] };
      });
    this.debris = null;
    // rough size in world units, for health bars, bubbles and reach
    let top = 0;
    let half = 0;
    for (const p of spec.parts) {
      if (p.opt) continue;
      top = Math.max(top, p.o[1] + p.s[1] / 2);
      half = Math.max(half, Math.abs(p.o[0]) + p.s[0] / 2);
    }
    this.height = ((Math.min(top, 30) + (spec.hover || 0)) * this.scale) / 16;
    this.width = (half * 2 * this.scale) / 16;
  }

  get busy() {
    return !!this.action;
  }

  /** Start an action: { name, dur, hitAt (0..1), onHit, onEnd, loop } */
  play(name, opts = {}) {
    this.action = { name, t: 0, dur: opts.dur || 0.6, hitAt: opts.hitAt ?? 0.5, onHit: opts.onHit, onEnd: opts.onEnd, fired: false, loop: !!opts.loop, data: opts.data };
  }

  hurt(strength = 1) {
    this.hurtT = 0;
    this.hurtK = Math.min(1.4, 0.6 + strength * 0.5);
    this.flash = 1;
  }

  /** Fall from the sky and land with a squash (enemies arriving, heroes walking in). */
  spawn(delay = 0) {
    this.spawnT = -delay;
  }

  /** Voxel shatter: every part flies off, tumbles and shrinks away. */
  shatter(power = 1) {
    if (this.debris) return;
    this.dead = true;
    this.debris = this.parts.map((p) => {
      const out = new THREE.Vector3(p.o[0], 0, p.o[2]).normalize();
      if (!isFinite(out.x)) out.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      out.applyAxisAngle(Y, this.yaw);
      const sp = (2 + Math.random() * 3) * power;
      return {
        p,
        vx: out.x * sp + (Math.random() - 0.5) * 2,
        vy: (3 + Math.random() * 4) * power,
        vz: out.z * sp + (Math.random() - 0.5) * 2,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spin: (Math.random() * 2 - 1) * 12,
        m: null,
        t: -Math.random() * 0.08,
      };
    });
    this.flash = 1;
  }

  setVisible(v) {
    this.visible = v;
  }

  dispose() {
    for (const p of this.parts) this.batch.remove(p.h);
    this.parts = [];
  }

  // ------------------------------------------------------------ per frame

  update(dt) {
    this.t += dt;
    if (this.moving) this.walkT += dt;
    this.hurtT += dt;
    this.spawnT += dt;
    if (this.ko) this.koT += dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 7);

    const a = this.action;
    if (a) {
      a.t += dt;
      const k = a.t / a.dur;
      if (!a.fired && k >= a.hitAt) {
        a.fired = true;
        a.onHit?.();
      }
      if (k >= 1) {
        if (a.loop) {
          a.t -= a.dur;
          a.fired = false;
        } else {
          this.action = null;
          a.onEnd?.();
        }
      }
    }

    if (this.debris) return this.updateDebris(dt);

    const pose = {};
    if (this.spec.animate) {
      this.spec.animate(this, pose); // props such as chests bring their own animator
      spawnLayer(this, pose);
    } else {
      const anim = ANIMS[this.spec.anim || 'human'] || ANIMS.human;
      anim(this, pose);
      commonLayers(this, pose);
    }
    this.applyPose(pose);
    this.applyColors();
  }

  applyColors() {
    const want = this.flash > 0.02 ? this.flash : 0;
    const tint = this.tint;
    if (want === this.flashShown && tint === this.tintShown) return;
    this.flashShown = want;
    this.tintShown = tint;
    for (const p of this.parts) {
      _c.copy(p.color);
      if (tint) _c.lerp(tint.color, tint.k);
      if (want) _c.lerp(WHITE, want * 0.85);
      this.batch.setColor(p.h, _c);
    }
  }

  /** Entity matrix: position, yaw, scale (px -> world). */
  entityMatrix(out) {
    const s = this.scale * PX;
    _q.setFromAxisAngle(Y, this.yaw);
    return out.compose(_v.copy(this.pos), _q, _s.set(s, s, s));
  }

  applyPose(pose) {
    const E = this.entityMatrix(_m2.identity());
    for (const b of this.bones) {
      const a = pose[b.name];
      const rx = b.rest[0] + (a?.rx || 0);
      const ry = b.rest[1] + (a?.ry || 0);
      const rz = b.rest[2] + (a?.rz || 0);
      _q.setFromEuler(_e.set(rx, ry, rz));
      _m.compose(_v.set(b.p[0] + (a?.dx || 0), b.p[1] + (a?.dy || 0), b.p[2] + (a?.dz || 0)), _q, _s.set(a?.sx ?? 1, a?.sy ?? 1, a?.sz ?? 1));
      b.world.makeTranslation(-b.p[0], -b.p[1], -b.p[2]).premultiply(_m);
      if (b.parent) b.world.premultiply(this.boneOf[b.parent].world);
      else b.world.premultiply(E);
    }
    const hide = !this.visible;
    for (const p of this.parts) {
      if (hide || (p.opt && !pose.show?.[p.opt])) {
        _m.makeScale(0.0001, 0.0001, 0.0001).setPosition(0, -500, 0);
        this.batch.setMatrix(p.h, _m);
        continue;
      }
      _m.multiplyMatrices(p.bone.world, p.local);
      this.batch.setMatrix(p.h, _m);
    }
  }

  updateDebris(dt) {
    const E = this.entityMatrix(_m2.identity());
    let alive = 0;
    for (const d of this.debris) {
      d.t += dt;
      if (!d.m) {
        // freeze where the part was at the moment of death
        d.m = new THREE.Matrix4().multiplyMatrices(d.p.bone.world, d.p.local);
        d.pos = new THREE.Vector3().setFromMatrixPosition(d.m);
        d.rot = new THREE.Quaternion();
        d.scl = new THREE.Vector3();
        d.m.decompose(_v, d.rot, d.scl);
      }
      if (d.t < 0) {
        alive++;
        continue;
      }
      const life = 0.9;
      const k = d.t / life;
      if (k >= 1) {
        _m.makeScale(0.0001, 0.0001, 0.0001).setPosition(0, -500, 0);
        this.batch.setMatrix(d.p.h, _m);
        continue;
      }
      alive++;
      d.vy -= 26 * dt;
      d.pos.x += d.vx * dt;
      d.pos.y += d.vy * dt;
      d.pos.z += d.vz * dt;
      const floor = this.pos.y + 0.05;
      if (d.pos.y < floor) {
        d.pos.y = floor;
        d.vy *= -0.35;
        d.vx *= 0.7;
        d.vz *= 0.7;
      }
      _q.setFromAxisAngle(d.axis, d.spin * d.t).multiply(d.rot);
      const sh = 1 - easeIn(k);
      _m.compose(d.pos, _q, _s.copy(d.scl).multiplyScalar(Math.max(0.0001, sh)));
      this.batch.setMatrix(d.p.h, _m);
    }
    void E;
    this.applyColors();
    if (!alive) this.gone = true;
  }
}

// ---------------------------------------------------------------- shared layers

/** Hurt recoil, flash, spawn drop + squash, blink, KO. Applied on top of every animator. */
function commonLayers(c, P) {
  spawnLayer(c, P);
  const r = P.root;
  // hurt: knocked back a step, leaning away, squashed
  hurtEtc(c, P, r);
}

function spawnLayer(c, P) {
  const r = (P.root ||= {});
  // spawn: fall in from above with a stretch, land with a squash
  if (c.spawnT < 0) {
    r.dy = (r.dy || 0) + 400;
  } else if (c.spawnT < 0.9) {
    const fall = 0.32;
    if (c.spawnT < fall) {
      const k = c.spawnT / fall;
      r.dy = (r.dy || 0) + (1 - k * k) * 90;
      r.sy = (r.sy || 1) * (1 + 0.35 * k);
      r.sx = (r.sx || 1) * (1 - 0.15 * k);
      r.sz = (r.sz || 1) * (1 - 0.15 * k);
    } else {
      const t = c.spawnT - fall;
      const s = 0.38 * Math.exp(-7 * t) * Math.cos(18 * t);
      r.sy = (r.sy || 1) * (1 - s);
      r.sx = (r.sx || 1) * (1 + s * 0.55);
      r.sz = (r.sz || 1) * (1 + s * 0.55);
    }
  }
}

function hurtEtc(c, P, r) {
  if (c.hurtT < 0.45) {
    const k = Math.exp(-9 * c.hurtT) * Math.sin(Math.min(1, c.hurtT / 0.06) * Math.PI * 0.5) * (c.hurtK || 1);
    r.dz = (r.dz || 0) - 2.2 * k;
    r.sy = (r.sy || 1) * (1 - 0.12 * k);
    r.sx = (r.sx || 1) * (1 + 0.08 * k);
    r.sz = (r.sz || 1) * (1 + 0.08 * k);
    const t = (P.torso ||= {});
    t.rx = (t.rx || 0) - 0.35 * k;
    const h = (P.head ||= {});
    h.rx = (h.rx || 0) - 0.25 * k;
  }
  // blink every few seconds (eyes squash flat for a moment)
  const sinceBlink = c.t - c.blinkAt;
  if (sinceBlink > 0) {
    if (sinceBlink < 0.13) (P.eyes ||= {}).sy = 0.12;
    else c.blinkAt = c.t + 2.2 + Math.random() * 3.5;
  }
  if (c.ko) {
    (P.eyes ||= {}).sy = 0.15; // eyes shut while knocked out
  }
}

// ---------------------------------------------------------------- animators

const ANIMS = {
  human(c, P) {
    const t = c.t + c.phase;
    const br = Math.sin(t * 2.3);
    const crouch = c.spec.stance === 'crouch' ? 1 : 0;
    const heavy = c.spec.stance === 'heavy' ? 1 : 0;
    P.root = { sy: 1 + 0.022 * br, sx: 1 - 0.01 * br, sz: 1 - 0.01 * br, dy: -0.6 * crouch };
    P.torso = { rx: 0.03 * br + 0.16 * crouch + 0.05 * heavy };
    P.head = { dy: 0.22 * Math.sin(t * 2.3 - 0.6), rz: 0.035 * Math.sin(t * 0.9), rx: -0.08 * crouch };
    P.armL = { rz: -0.07 - 0.035 * br - 0.12 * heavy, rx: 0.05 - 0.25 * crouch };
    P.armR = { rz: 0.07 + 0.035 * br + 0.12 * heavy, rx: 0.05 - 0.25 * crouch };
    P.legL = { rx: 0.25 * crouch, rz: -0.05 * heavy };
    P.legR = { rx: -0.15 * crouch, rz: 0.05 * heavy };
    P.cape = { rx: 0.14 + 0.08 * Math.sin(t * 1.7) + 0.12 * crouch, rz: 0.04 * Math.sin(t * 1.3) };
    P.hat = { rx: 0.05 * Math.sin(t * 2.3 - 1.2), rz: 0.03 * Math.sin(t * 1.1) };
    P.lantern = { rx: 0.12 * Math.sin(t * 1.9), rz: 0.1 * Math.sin(t * 1.4) };
    P.handL = {};
    P.handR = {};

    if (c.moving) {
      const s = Math.sin(c.walkT * 13);
      P.legL.rx = -0.85 * s;
      P.legR.rx = 0.85 * s;
      P.armL.rx = 0.7 * s;
      P.armR.rx = -0.7 * s;
      P.root.dy += Math.abs(Math.cos(c.walkT * 13)) * 1.1;
      P.torso.rx += 0.16;
      P.cape.rx += 0.35;
    }

    const a = c.action;
    if (a) humanAction(c, P, a);

    if (c.ko) {
      const k = easeOut(c.koT / 0.45);
      P.root.dy = lerp(P.root.dy || 0, -3.1, k);
      P.legL = { rx: -1.45 * k, ry: -0.25 * k };
      P.legR = { rx: -1.45 * k, ry: 0.25 * k };
      P.torso.rx = lerp(P.torso.rx, -0.22, k);
      P.armL = { rx: -0.35 * k, rz: -0.45 * k };
      P.armR = { rx: -0.35 * k, rz: 0.45 * k };
      P.head.rz = 0.22 * Math.sin(c.koT * 2.2) * k;
      P.head.rx = 0.2 * k;
      P.show = { ...(P.show || {}), stars: true };
      P.fx = { ry: c.koT * 3 };
    }
  },

  /** Round jelly creatures: everything is squash and stretch. */
  blob(c, P) {
    const t = c.t + c.phase;
    const b = Math.sin(t * 3.1);
    P.root = { sy: 1 + 0.06 * b, sx: 1 - 0.035 * b, sz: 1 - 0.035 * b };
    P.top = { rz: 0.12 * Math.sin(t * 2.2), rx: 0.08 * Math.sin(t * 1.7) };
    if (c.moving) {
      const h = Math.abs(Math.sin(c.walkT * 9));
      P.root.dy = h * 4;
      P.root.sy *= 1 + 0.15 * h;
    }
    const a = c.action;
    if (a) {
      const k = a.t / a.dur;
      if (a.name === 'cast') {
        const up = Math.sin(Math.PI * clamp01(k / 0.7));
        P.root.sy *= 1 + 0.25 * up;
        P.root.sx *= 1 - 0.1 * up;
        P.root.sz *= 1 - 0.1 * up;
      } else {
        // hop forward and land on the target
        const pre = clamp01(k / 0.3);
        const air = clamp01((k - 0.3) / 0.3);
        const back = clamp01((k - 0.6) / 0.4);
        if (k < 0.3) {
          P.root.sy *= 1 - 0.25 * ease(pre);
          P.root.sx *= 1 + 0.15 * ease(pre);
          P.root.sz *= 1 + 0.15 * ease(pre);
        } else if (k < 0.6) {
          P.root.dy = Math.sin(Math.PI * air) * 7;
          P.root.dz = 6 * air;
          P.root.sy *= 1.2;
        } else {
          const s = 0.35 * Math.exp(-6 * back) * Math.cos(14 * back);
          P.root.dz = 6 * (1 - ease(back));
          P.root.sy *= 1 - s;
          P.root.sx *= 1 + s * 0.6;
          P.root.sz *= 1 + s * 0.6;
        }
      }
    }
  },

  /** Many-legged crawlers: skittering legs, a body that bobs, lunges. */
  bug(c, P) {
    const t = c.t + c.phase;
    P.root = { dy: 0.4 * Math.sin(t * 4), sy: 1 + 0.02 * Math.sin(t * 4) };
    P.head = { rx: 0.06 * Math.sin(t * 2), ry: 0.08 * Math.sin(t * 1.3) };
    const speed = c.moving ? 18 : 3;
    const amp = c.moving ? 0.5 : 0.08;
    for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      P['leg' + i] = { rx: amp * Math.sin(c.t * speed + i * 1.7), rz: side * 0.05 * Math.sin(t * 3 + i) };
    }
    P.tail = { rx: 0.1 * Math.sin(t * 2) };
    const a = c.action;
    if (a) {
      const k = a.t / a.dur;
      const wind = ease(k / 0.4);
      const strike = clamp01((k - 0.4) / 0.15);
      const back = ease((k - 0.55) / 0.45);
      const lunge = k < 0.4 ? -2 * wind : k < 0.55 ? lerp(-2, 7, easeOut(strike)) : lerp(7, 0, back);
      P.root.dz = lunge;
      P.root.rx = k < 0.4 ? -0.12 * wind : k < 0.55 ? 0.15 : 0.15 * (1 - back);
      P.head.rx += k < 0.4 ? -0.3 * wind : k < 0.55 ? 0.35 : 0.35 * (1 - back);
    }
  },

  /** Hovering things: bob, wing beats, dives. */
  flyer(c, P) {
    const t = c.t + c.phase;
    const flap = Math.sin(t * (c.spec.flapSpeed || 11));
    P.root = { dy: (c.spec.hover ?? 10) + 1.6 * Math.sin(t * 2.2), rz: 0.06 * Math.sin(t * 1.3) };
    P.wingL = { rz: 0.7 * flap, ry: 0.1 * flap };
    P.wingR = { rz: -0.7 * flap, ry: -0.1 * flap };
    P.head = { rz: 0.06 * Math.sin(t * 1.7) };
    P.handL = { dy: 1.2 * Math.sin(t * 2.2 + 1), dx: 0.6 * Math.sin(t * 1.3) };
    P.handR = { dy: 1.2 * Math.sin(t * 2.2 + 2.4), dx: -0.6 * Math.sin(t * 1.5) };
    P.orbit = { ry: t * 0.9 };
    P.top = { ry: t * 0.4, dy: 0.6 * Math.sin(t * 1.6) };
    const a = c.action;
    if (a) {
      const k = a.t / a.dur;
      if (a.name === 'slam') {
        // floating fists rise, then smash forward
        const up = ease(k / 0.45);
        const hit = clamp01((k - 0.45) / 0.12);
        const back = ease((k - 0.6) / 0.4);
        const lift = k < 0.45 ? up : k < 0.6 ? 1 - hit : 0;
        const fwd = k < 0.45 ? 0 : k < 0.6 ? hit : 1 - back;
        for (const h of ['handL', 'handR']) {
          P[h].dy += 10 * lift - 6 * fwd;
          P[h].dz = 12 * fwd;
          P[h].sx = P[h].sy = P[h].sz = 1 + 0.25 * lift;
        }
        P.root.rx = -0.15 * lift + 0.2 * fwd;
      } else if (a.name === 'cast') {
        const up = Math.sin(Math.PI * clamp01(k));
        P.root.dy += 3 * up;
        P.top.ry += 6 * up;
        P.orbit.ry += 4 * up;
        P.root.sy = 1 + 0.1 * up;
      } else {
        const dive = Math.sin(Math.PI * clamp01(k / 0.75));
        P.root.dz = 9 * dive;
        P.root.dy -= 5 * dive;
        P.root.rx = 0.4 * dive;
        P.wingL.rz *= 1.5;
        P.wingR.rz *= 1.5;
      }
    }
  },

  /** Big heavy bodies: slow breathing sway, overhead slams. */
  golem(c, P) {
    ANIMS.human(c, P);
    const t = c.t + c.phase;
    P.root.sy = 1 + 0.012 * Math.sin(t * 1.4);
    P.torso.rz = 0.03 * Math.sin(t * 0.9);
    P.top = { rz: 0.05 * Math.sin(t * 1.2) };
  },
};

function humanAction(c, P, a) {
  const k = a.t / a.dur;
  const kind = a.name;
  if (kind === 'slash' || kind === 'stab') {
    const wind = ease(k / 0.42);
    const strike = easeOut((k - 0.42) / 0.14);
    const back = ease((k - 0.56) / 0.44);
    let arm;
    let twist;
    let lean;
    if (k < 0.42) {
      arm = -2.7 * wind;
      twist = 0.4 * wind;
      lean = -0.1 * wind;
      P.root.sy *= 1 - 0.06 * wind;
    } else if (k < 0.56) {
      arm = lerp(-2.7, -0.15, strike);
      twist = lerp(0.4, -0.45, strike);
      lean = lerp(-0.1, 0.28, strike);
      P.root.sy *= 1 + 0.07 * strike;
      P.root.dz = (P.root.dz || 0) + 1.5 * strike;
    } else {
      arm = lerp(-0.15, 0, back);
      twist = lerp(-0.45, 0, back);
      lean = lerp(0.28, 0, back);
      P.root.dz = (P.root.dz || 0) + 1.5 * (1 - back);
    }
    if (kind === 'stab') {
      // both blades: the off hand follows half a beat later
      P.armR.rx = arm * 0.7;
      P.armL.rx = (k < 0.5 ? -1.6 * wind : lerp(-1.6, 0, ease((k - 0.5) / 0.5))) * 0.9;
    } else P.armR.rx = arm;
    P.torso.ry = twist;
    P.torso.rx += lean;
    P.armL.rx = P.armL.rx || 0;
    if (c.spec.shieldUp && kind === 'slash') P.armL.rx = -0.9 * Math.sin(Math.PI * clamp01(k)); // shield forward while swinging
  } else if (kind === 'bash') {
    // shield bash: shove the shield forward
    const push = Math.sin(Math.PI * clamp01(k / 0.7));
    P.armL.rx = -1.4 * push;
    P.armL.rz = 0.35 * push;
    P.root.dz = 3.5 * push;
    P.torso.ry = -0.35 * push;
    P.torso.rx += 0.2 * push;
  } else if (kind === 'shoot') {
    const raise = ease(k / 0.25);
    const draw = ease((k - 0.2) / 0.4);
    const rel = clamp01((k - 0.62) / 0.1);
    const down = ease((k - 0.75) / 0.25);
    const aim = raise * (1 - down);
    P.armL.rx = -1.5 * aim;
    P.handL.rx = 1.5 * aim; // keep the bow upright
    P.armR.rx = -1.45 * aim;
    P.armR.dz = -2.4 * draw * (1 - rel);
    P.armR.ry = 0.2 * aim;
    P.torso.ry = -0.3 * aim;
    P.root.dz = (P.root.dz || 0) - 0.8 * rel * (1 - down);
  } else if (kind === 'cast') {
    const up = ease(k / 0.5);
    const rel = clamp01((k - 0.5) / 0.12);
    const down = ease((k - 0.62) / 0.38);
    const hold = up * (1 - down);
    P.armR.rx = -1.9 * hold - 0.5 * rel * (1 - down);
    P.armL.rx = -1.2 * hold;
    P.armL.rz = -0.4 * hold;
    P.torso.rx += -0.15 * hold + 0.25 * rel * (1 - down);
    P.root.sy *= 1 + 0.08 * hold - 0.08 * rel * (1 - down);
    P.root.dy = (P.root.dy || 0) + 1.2 * Math.sin(Math.PI * clamp01(k / 0.6));
    P.hat.rx += 0.25 * rel * (1 - down);
  } else if (kind === 'heal') {
    const up = Math.sin(Math.PI * clamp01(k));
    P.armR.rx = -2.4 * up;
    P.armL.rx = -1.3 * up;
    P.armL.rz = -0.5 * up;
    P.root.dy = (P.root.dy || 0) + 2.2 * Math.sin(Math.PI * clamp01(k * 2)) * (k < 0.5 ? 1 : 0);
    P.lantern.rx += 0.5 * up;
  } else if (kind === 'throw') {
    const wind = ease(k / 0.4);
    const fling = easeOut((k - 0.4) / 0.15);
    const back = ease((k - 0.55) / 0.45);
    P.armR.rx = k < 0.4 ? 0.9 * wind : k < 0.55 ? lerp(0.9, -2.4, fling) : lerp(-2.4, 0, back);
    P.torso.ry = k < 0.4 ? 0.4 * wind : k < 0.55 ? lerp(0.4, -0.3, fling) : lerp(-0.3, 0, back);
    P.armL.rx = -0.6 * Math.sin(Math.PI * clamp01(k));
  } else if (kind === 'slam') {
    const up = ease(k / 0.5);
    const down = easeIn((k - 0.5) / 0.1);
    const back = ease((k - 0.62) / 0.38);
    const arm = k < 0.5 ? -2.9 * up : k < 0.6 ? lerp(-2.9, -0.5, down) : lerp(-0.5, 0, back);
    P.armL.rx = arm;
    P.armR.rx = arm;
    P.torso.rx += k < 0.5 ? -0.25 * up : k < 0.6 ? lerp(-0.25, 0.35, down) : lerp(0.35, 0, back);
    P.root.sy *= k < 0.5 ? 1 + 0.06 * up : k < 0.62 ? 1 - 0.14 * down : 1 - 0.14 * (1 - back);
    P.root.sx *= k >= 0.5 && k < 0.62 ? 1 + 0.08 * down : 1;
  } else if (kind === 'cheer') {
    const ph = (a.t * 2.6 + c.phase) % 1;
    const hop = Math.sin(Math.PI * ph);
    P.root.dy = (P.root.dy || 0) + 3.4 * hop;
    P.root.sy *= 1 + 0.1 * hop - (ph > 0.9 ? 0.15 : 0);
    P.armL.rx = -2.6 + 0.3 * hop;
    P.armR.rx = -2.6 + 0.3 * hop;
    P.armL.rz = -0.3;
    P.armR.rz = 0.3;
  } else if (kind === 'wave') {
    P.armR.rx = -2.6;
    P.armR.rz = 0.35 + 0.35 * Math.sin(a.t * 12);
  } else if (kind === 'sit') {
    P.root.dy = (P.root.dy || 0) - 3.1;
    P.legL.rx = -1.45;
    P.legR.rx = -1.45;
    P.legL.ry = -0.2;
    P.legR.ry = 0.2;
    P.torso.rx -= 0.05;
    P.armL.rx = -0.5;
    P.armR.rx = -0.5;
  }
}

/** Little gold stars that orbit a knocked-out hero's head (bone `fx`, shown when ko). */
export function koStars(y = 23) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p = part('fx', 'orb', 'magic', '#ffd34d', [Math.cos(a) * 5, y, Math.sin(a) * 5], [1.6, 1.6, 1.6]);
    p.opt = 'stars';
    out.push(p);
  }
  return out;
}
