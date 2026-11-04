import * as THREE from 'three';
import { MultiBatch, prep } from './kit.js';

/*
 * Battle juice: projectiles, sparkles, shockwave rings, ice blocks, shield bubbles, and the HTML
 * overlay with health bars and floating numbers. Positions are in the arena group's local space.
 */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

const LOOKS = {
  arrow: [
    { shape: 'beam', mat: 'grain', color: '#a8693a', s: [0.9, 0.22, 0.22], off: 0 },
    { shape: 'cube', mat: 'metal', color: '#dfe8f0', s: [0.18, 0.16, 0.16], off: 0.5 },
    { shape: 'cube', mat: 'fabric', color: '#ff9a3c', s: [0.22, 0.2, 0.06], off: -0.42 },
  ],
  orb: [{ shape: 'orb', mat: 'magic', s: 0.55 }],
  bigorb: [{ shape: 'orb', mat: 'ember', color: '#ff7a2f', s: 1.1 }, { shape: 'orb', mat: 'magic', color: '#ffd34d', s: 0.7 }],
  mote: [{ shape: 'orb', mat: 'magic', s: 0.35 }],
  bomb: [{ shape: 'orb', mat: 'metal', color: '#3a3f4a', s: 0.6 }, { shape: 'cube', mat: 'ember', color: '#ffb347', s: 0.14, offY: 0.36 }],
  bigbomb: [{ shape: 'orb', mat: 'metal', color: '#3a3f4a', s: 0.95 }, { shape: 'cube', mat: 'ember', color: '#ff6b3c', s: 0.2, offY: 0.55 }],
  spore: [{ shape: 'orb', mat: 'magic', s: 0.4 }],
  shard: [{ shape: 'spire', mat: 'magic', s: [0.35, 0.9, 0.35], point: true }],
  star: [{ shape: 'cube', mat: 'magic', color: '#ffd34d', s: 0.55 }],
};

export class BattleFX {
  constructor(group, overlay, camera, groupOrigin) {
    this.group = group;
    this.batch = new MultiBatch(group, { shadows: false });
    this.overlay = overlay;
    this.camera = camera;
    this.origin = groupOrigin;
    this.projs = [];
    this.sparks = [];
    this.rings = [];
    this.bubbles = new Map();
    this.ices = new Map();
    this.time = 0;
    this.shake = 0;
    const bubbleMat = new THREE.MeshStandardMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.28, roughness: 0.1, emissive: '#3a8fd0', emissiveIntensity: 0.5, depthWrite: false });
    this.bubbleGeo = new THREE.IcosahedronGeometry(1, 2);
    this.bubbleMat = bubbleMat;
    this.iceMat = new THREE.MeshStandardMaterial({ color: '#cfefff', transparent: true, opacity: 0.55, roughness: 0.15, emissive: '#5ab8e8', emissiveIntensity: 0.35, depthWrite: false });
    this.iceGeo = new THREE.BoxGeometry(1, 1, 1);
  }

  // ------------------------------------------------------------ projectiles

  /** kind from LOOKS; from/to Vector3; dur seconds; arc height; onHit() at arrival. */
  shoot(kind, from, to, { dur = 0.45, arc = 0, color = '#ffffff', onHit, trail = null, spin = 0 } = {}) {
    const look = LOOKS[kind] || LOOKS.orb;
    const parts = look.map((l) => {
      const b = prep({ shape: l.shape, mat: l.mat, s: l.s });
      return { l, b, h: this.batch.add(b, from.x, from.y, from.z, 0.001, 0.001, 0.001, null, new THREE.Color(l.color || color)) };
    });
    this.projs.push({ kind, from: from.clone(), to: to.clone(), dur, arc, t: 0, onHit, parts, trail, trailT: 0, color, spin });
  }

  // ------------------------------------------------------------ particles

  /** A burst of tiny glowing bits. */
  burst(pos, color, n = 10, { speed = 3, up = 2, life = 0.6, size = 0.18, gravity = -6, shape = 'cube', mat = 'magic', spread = 0.2 } = {}) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      const b = prep({ shape, mat });
      const p = {
        h: this.batch.add(b, pos.x, pos.y, pos.z, 0.001, 0.001, 0.001, null, c),
        x: pos.x + (Math.random() - 0.5) * spread,
        y: pos.y + (Math.random() - 0.5) * spread,
        z: pos.z + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * sp,
        vy: up * (0.5 + Math.random()),
        vz: Math.sin(a) * sp,
        g: gravity,
        life: life * (0.7 + Math.random() * 0.6),
        t: 0,
        s: size * (0.7 + Math.random() * 0.6),
        spin: (Math.random() - 0.5) * 10,
      };
      this.sparks.push(p);
    }
  }

  /** Sparkles rising around a point (heals, buffs). */
  rise(pos, color, n = 8, radius = 0.6) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = radius * Math.sqrt(Math.random());
      const b = prep({ shape: 'cube', mat: 'magic' });
      this.sparks.push({
        h: this.batch.add(b, pos.x, pos.y, pos.z, 0.001, 0.001, 0.001, null, c),
        x: pos.x + Math.cos(a) * r,
        y: pos.y + Math.random() * 0.4,
        z: pos.z + Math.sin(a) * r,
        vx: 0,
        vy: 1.2 + Math.random() * 1.2,
        vz: 0,
        g: 0,
        life: 0.8 + Math.random() * 0.5,
        t: -Math.random() * 0.3,
        s: 0.12 + Math.random() * 0.1,
        spin: 3,
      });
    }
  }

  /** A flat ring of cubes expanding along the floor (slams, explosions). */
  ring(pos, color, radius = 2.5, n = 18) {
    const c = new THREE.Color(color);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const b = prep({ shape: 'cube', mat: 'magic' });
      parts.push({ a: (i / n) * Math.PI * 2, h: this.batch.add(b, pos.x, pos.y, pos.z, 0.001, 0.001, 0.001, null, c) });
    }
    this.rings.push({ pos: pos.clone(), parts, radius, t: 0, life: 0.5 });
  }

  /** Lightning: a jagged line of little cubes between two points that fades quickly. */
  bolt(a, b, color = '#c9a6ff') {
    const c = new THREE.Color(color);
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      _v.lerpVectors(a, b, k);
      if (i > 0 && i < n) _v.add(_v2.set((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
      const bb = prep({ shape: 'cube', mat: 'magic' });
      this.sparks.push({ h: this.batch.add(bb, _v.x, _v.y, _v.z, 0.001, 0.001, 0.001, null, c), x: _v.x, y: _v.y, z: _v.z, vx: 0, vy: 0, vz: 0, g: 0, life: 0.28, t: 0, s: 0.24, spin: 0 });
    }
  }

  // ------------------------------------------------------------ status visuals

  setBubble(unit, on) {
    let m = this.bubbles.get(unit);
    if (on && !m) {
      m = new THREE.Mesh(this.bubbleGeo, this.bubbleMat);
      m.renderOrder = 3;
      m.userData.born = this.time;
      this.group.add(m);
      this.bubbles.set(unit, m);
    } else if (!on && m) {
      this.group.remove(m);
      this.bubbles.delete(unit);
      this.burst(_v.copy(unit.char.pos).setY(unit.char.pos.y + unit.char.height * 0.5), '#9fd8ff', 10, { speed: 2.5, up: 1.5, life: 0.4 });
    }
  }

  setIce(unit, on) {
    let m = this.ices.get(unit);
    if (on && !m) {
      m = new THREE.Mesh(this.iceGeo, this.iceMat);
      m.renderOrder = 3;
      m.userData.born = this.time;
      this.group.add(m);
      this.ices.set(unit, m);
    } else if (!on && m) {
      this.group.remove(m);
      this.ices.delete(unit);
      this.burst(_v.copy(unit.char.pos).setY(unit.char.pos.y + unit.char.height * 0.5), '#cfefff', 14, { speed: 3, up: 2.5, life: 0.5, mat: 'magic' });
    }
  }

  // ------------------------------------------------------------ overlay text

  screen(pos, out = { x: 0, y: 0 }) {
    _v.copy(pos).add(this.origin).project(this.camera);
    out.x = ((_v.x + 1) / 2) * this.overlay.clientWidth;
    out.y = ((1 - _v.y) / 2) * this.overlay.clientHeight;
    out.behind = _v.z > 1;
    return out;
  }

  /** Floating number / word: kind dmg | crit | heal | shield | miss | info */
  text(pos, str, kind = 'dmg') {
    const p = this.screen(pos);
    const el = document.createElement('div');
    el.className = `pop pop-${kind}`;
    el.textContent = str;
    el.style.left = `${p.x + (Math.random() - 0.5) * 18}px`;
    el.style.top = `${p.y}px`;
    this.overlay.append(el);
    setTimeout(() => el.remove(), 1100);
  }

  clearAll() {
    for (const p of this.projs) for (const q of p.parts) this.batch.remove(q.h);
    for (const s of this.sparks) this.batch.remove(s.h);
    for (const r of this.rings) for (const q of r.parts) this.batch.remove(q.h);
    this.projs = [];
    this.sparks = [];
    this.rings = [];
    for (const m of this.bubbles.values()) this.group.remove(m);
    for (const m of this.ices.values()) this.group.remove(m);
    this.bubbles.clear();
    this.ices.clear();
    this.overlay.querySelectorAll('.pop').forEach((e) => e.remove());
  }

  // ------------------------------------------------------------ per frame

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 2.2);

    const keep = [];
    for (const p of this.projs) {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      _v.lerpVectors(p.from, p.to, k);
      _v.y += Math.sin(Math.PI * k) * p.arc;
      // heading: derivative of the path
      const k2 = Math.min(1, k + 0.02);
      _v2.lerpVectors(p.from, p.to, k2);
      _v2.y += Math.sin(Math.PI * k2) * p.arc;
      _v2.sub(_v);
      if (_v2.lengthSq() < 1e-8) _v2.copy(p.to).sub(p.from);
      _v2.normalize();
      for (const q of p.parts) {
        const l = q.l;
        const sv = Array.isArray(l.s) ? l.s : [l.s, l.s, l.s];
        if (p.kind === 'arrow') _q.setFromUnitVectors(X, _v2);
        else if (l.point) _q.setFromUnitVectors(Y, _v2);
        else _q.setFromAxisAngle(_s.set(0.3, 1, 0.2).normalize(), p.t * (p.spin || 6));
        const off = l.off || 0;
        _m.compose(_s.set(_v.x + _v2.x * off, _v.y + _v2.y * off + (l.offY || 0), _v.z + _v2.z * off), _q, new THREE.Vector3(...sv));
        this.batch.setMatrix(q.h, _m);
      }
      if (p.trail) {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.025;
          this.burst(_v, p.trail, 1, { speed: 0.4, up: 0.4, life: 0.35, size: 0.16, gravity: 0 });
        }
      }
      if (k >= 1) {
        for (const q of p.parts) this.batch.remove(q.h);
        p.onHit?.();
      } else keep.push(p);
    }
    this.projs = keep;

    const sk = [];
    for (const s of this.sparks) {
      s.t += dt;
      if (s.t < 0) {
        sk.push(s);
        continue;
      }
      if (s.t >= s.life) {
        this.batch.remove(s.h);
        continue;
      }
      s.vy += s.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      const k = s.t / s.life;
      const sc = s.s * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
      _q.setFromAxisAngle(Y, s.spin * s.t);
      _m.compose(_s.set(s.x, s.y, s.z), _q, _v.set(sc, sc, sc));
      this.batch.setMatrix(s.h, _m);
      sk.push(s);
    }
    this.sparks = sk;

    const rk = [];
    for (const r of this.rings) {
      r.t += dt;
      const k = r.t / r.life;
      if (k >= 1) {
        for (const q of r.parts) this.batch.remove(q.h);
        continue;
      }
      const rad = r.radius * (1 - Math.pow(1 - k, 2));
      const sc = 0.35 * (1 - k);
      for (const q of r.parts) {
        _q.setFromAxisAngle(Y, q.a);
        _m.compose(_s.set(r.pos.x + Math.cos(q.a) * rad, r.pos.y + 0.1, r.pos.z + Math.sin(q.a) * rad), _q, _v.set(sc, sc * 0.6, sc));
        this.batch.setMatrix(q.h, _m);
      }
      rk.push(r);
    }
    this.rings = rk;

    for (const [u, m] of this.bubbles) {
      const c = u.char;
      const age = this.time - m.userData.born;
      const pop = age < 0.35 ? 1 + 0.25 * Math.sin((age / 0.35) * Math.PI) * (1 - age / 0.35) : 1;
      const r = Math.max(0.75, c.height * 0.62) * pop * (1 + 0.03 * Math.sin(this.time * 4));
      m.position.set(c.pos.x, c.pos.y + c.height * 0.5, c.pos.z);
      m.scale.set(r, r, r);
    }
    for (const [u, m] of this.ices) {
      const c = u.char;
      const age = this.time - m.userData.born;
      const k = Math.min(1, age / 0.18);
      const w = Math.max(0.9, c.width || 0.9) * k;
      m.position.set(c.pos.x, c.pos.y + (c.height * 0.5 + 0.1) * k, c.pos.z);
      m.scale.set(w, (c.height + 0.2) * k, w);
    }
  }
}
