import * as THREE from 'three';
import { IslandFX } from './islandfx.js';
import { generateIsland } from './island.js';
import { blueprint, rotateXZ } from './blueprints.js';
import { jitterColor } from './voxels.js';
import { mulberry32, hash2 } from './rng.js';
import { MultiBatch } from './kit.js';
import { Character } from './chars.js';
import { heroSpec } from './heroes.js';

/*
 * Camp: the floating home island between delves. Same recipe as Voxel Focus World (island.js,
 * IslandFX drops, blueprint buildings) with a stone plaza and campfire in the middle, the Delve
 * Gate behind it, and plots for the buildings you unlock with embers.
 */

export const RADIUS = 16;

/** Buildings: blueprint kind, plot position, facing (rot as in rotateXZ), costs per level. */
export const BUILDINGS = {
  gate: { name: 'Delve Gate', kind: 'gate', x: 0, z: -9, rot: 0, costs: [], text: 'The way down into the Underroot. Start a delve here.' },
  forge: { name: 'Forge', kind: 'blacksmith', x: 9, z: -4, rot: 1, costs: [25], text: 'Upgrade each hero’s gear. Better gear shows on them.' },
  tavern: { name: 'Tavern', kind: 'tavern', x: -9, z: -4, rot: 3, costs: [30], text: 'Recruit new heroes and choose who delves.' },
  garden: { name: 'Herb Garden', kind: 'greenhouse', x: 9.5, z: 6, rot: 1, costs: [30, 55], text: 'Lv 1: campfires heal 50% instead of 35%. Lv 2: heroes also heal 8% after every battle.' },
  spire: { name: 'Spark Spire', kind: 'wizardtower', x: -10, z: 5.5, rot: 3, costs: [40, 70, 110], text: 'Lv 1: +2 sparks at the start of battles. Lv 2: sparks fill 20% faster. Lv 3: rewards offer one more choice.' },
  archive: { name: 'Relic Archive', kind: 'library', x: -3.5, z: 11, rot: 0, costs: [70], text: 'Start every delve with a random relic.' },
};

function gateBlocks() {
  const out = [];
  const stone = ['#b5bcc6', '#a7afba', '#c1c7d0'];
  const pickS = (i) => stone[i % 3];
  let i = 0;
  const put = (x, y, z, color, o = {}) => out.push({ x, y, z, color, ...o });
  for (let x = -3; x <= 3; x++) for (let z = -1; z <= 1; z++) put(x, 1, z, pickS(i++), { mat: 'stone', shape: 'slab', s: [1, 1, 1] });
  for (const sx of [-1, 1]) {
    for (let y = 1.5; y <= 5.5; y++) put(sx * 2.5, y, 0, pickS(i++), { mat: 'stone' });
    put(sx * 2.5, 6.5, 0, '#c1c7d0', { mat: 'stone', shape: 'slab', s: [1.3, 1, 1.3] });
    put(sx * 3.6, 1.5, 0.6, '#5d6470', { mat: 'metal', shape: 'post', s: [1.3, 1, 1.3] });
    put(sx * 3.6, 2.5, 0.6, '#5d6470', { mat: 'metal', shape: 'post', s: [1.3, 1, 1.3] });
    put(sx * 3.6, 3.3, 0.6, '#ffd36b', { mat: 'lantern', s: [0.5, 0.6, 0.5] });
    put(sx * 3.6, 3.75, 0.6, '#3a3f4a', { mat: 'metal', shape: 'cone', s: [0.8, 0.4, 0.8] });
  }
  for (let x = -1.5; x <= 1.5; x++) put(x, 6.5, 0, pickS(i++), { mat: 'stone' });
  put(-2.5, 7.3, 0, '#b5bcc6', { mat: 'stone', shape: 'wedge', r: 1, s: [1, 0.6, 1] });
  put(2.5, 7.3, 0, '#b5bcc6', { mat: 'stone', shape: 'wedge', r: 3, s: [1, 0.6, 1] });
  for (let x = -1.5; x <= 1.5; x++) put(x, 7.3, 0, '#c1c7d0', { mat: 'stone', shape: 'slab', s: [1, 0.6, 1] });
  put(0, 7.6, 0.2, '#b88cff', { mat: 'magic', shape: 'spire', s: [0.9, 1.6, 0.9] });
  // the glowing doorway
  for (let x = -1.5; x <= 1.5; x++) for (let y = 1.5; y <= 5.5; y++) put(x, y, 0, y > 4.5 ? '#c9a6ff' : '#9f7aff', { mat: 'magic', shape: 'pane', s: [1, 1, 0.5] });
  // rune stones
  for (const sx of [-1, 1]) put(sx * 1.6, 1.5, 1.8, '#8f97a3', { mat: 'rock', shape: 'rock', s: 0.6 });
  return out;
}

export class Base {
  constructor(scene, seed) {
    this.seed = seed;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.fx = new IslandFX(this.group);
    this.charBatch = new MultiBatch(this.group);
    this.buildings = {}; // id -> { blocks, level }
    this.plots = {}; // id -> blocks (dirt + sign)
    this.heroes = [];
    this.time = 0;
    this.fireLight = new THREE.PointLight(0xffa04a, 0, 18, 1.5);
    this.fireLight.position.set(0, 2.2, 0);
    this.group.add(this.fireLight);
    this.night = 0;
    this.buildGround();
  }

  // ------------------------------------------------------------ ground, plaza, nature

  buildGround() {
    const { blocks } = generateIsland(RADIUS, this.seed);
    const plaza = (x, z) => Math.hypot(x, z) < 3.6;
    this.paths = new Set();
    for (const b of Object.values(BUILDINGS)) {
      const fp = this.footprint(b);
      const [dx, dz] = rotateXZ(0, fp.front + 1, b.rot);
      const door = [b.x + dx, b.z + dz];
      // a simple walkway from the door to the plaza edge
      const steps = Math.ceil(Math.hypot(door[0], door[1]));
      for (let i = 0; i <= steps; i++) {
        const k = i / steps;
        const x = Math.round(door[0] * (1 - k));
        const z = Math.round(door[1] * (1 - k));
        if (!plaza(x, z)) this.paths.add(`${x},${z}`);
      }
      b.door = door;
    }
    const rng = mulberry32(hash2(this.seed, 77));
    for (const b of blocks) {
      if (b.y !== 0) continue;
      if (plaza(b.x, b.z)) {
        b.color = jitterColor(rng() < 0.5 ? '#c1c7d0' : '#b5bcc6', rng, 0.05);
        b.mat = 'stone';
      } else if (this.paths.has(`${b.x},${b.z}`)) {
        b.color = jitterColor(rng() < 0.5 ? '#c9a77a' : '#bf9c6e', rng, 0.05);
        b.mat = 'sand';
      }
    }
    for (const b of blocks) this.fx.add(b);
    this.ground = blocks;

    // campfire
    this.fire = [];
    const put = (x, y, z, color, o = {}) => {
      const blk = { x, y, z, color: jitterColor(color, rng, 0.05), ...o };
      this.fx.add(blk);
      this.fire.push(blk);
    };
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      put(Math.cos(a) * 1.05, 0.62, Math.sin(a) * 1.05, '#8f97a3', { mat: 'rock', shape: 'rock', s: 0.48 });
    }
    put(0, 0.72, 0, '#6b4a2f', { mat: 'log', shape: 'logx', s: [1.3, 0.42, 0.42] });
    put(0, 0.92, 0, '#7a5434', { mat: 'log', shape: 'logx', s: [1.3, 0.42, 0.42], r: 1 });
    this.flame = { x: 0, y: 1.3, z: 0, color: '#ff9a3c', mat: 'ember', shape: 'spire', s: [0.8, 0.9, 0.8] };
    this.fx.add(this.flame);
    // log benches around the fire
    for (const a of [0.6, 2.4, 4.2]) put(Math.cos(a) * 2.6, 0.72, Math.sin(a) * 2.6, '#7a5434', { mat: 'log', shape: 'logx', s: [1.6, 0.45, 0.45], r: Math.round(((a + Math.PI / 2) / (Math.PI / 2)) % 4) });

    // nature: trees, bushes, rocks, flowers, away from the plaza, paths and building plots
    this.nature = [];
    const blocked = (x, z, pad) => {
      if (Math.hypot(x, z) < 4.5 + pad) return true;
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (this.paths.has(`${Math.round(x) + dx},${Math.round(z) + dz}`)) return true;
      for (const b of Object.values(BUILDINGS)) {
        const fp = this.footprint(b);
        if (x > b.x + fp.x0 - 1.5 - pad && x < b.x + fp.x1 + 1.5 + pad && z > b.z + fp.z0 - 1.5 - pad && z < b.z + fp.z1 + 1.5 + pad) return true;
      }
      return false;
    };
    const tops = new Set(blocks.filter((b) => b.y === 0).map((b) => `${b.x},${b.z}`));
    for (let x = -RADIUS; x <= RADIUS; x++)
      for (let z = -RADIUS; z <= RADIUS; z++) {
        if (!tops.has(`${x},${z}`)) continue;
        const r = Math.hypot(x, z);
        if (r > RADIUS - 1.2) continue;
        const h = mulberry32(hash2(this.seed ^ 0xbeef, (x + 64) * 256 + z + 64));
        const roll = h();
        if (x % 3 === 0 && z % 3 === 0 && roll < (r > 10 ? 0.55 : 0.18) && !blocked(x, z, 0.8)) {
          for (const tb of blueprint('tree', Math.floor(h() * 1e6))) {
            const blk = { ...tb, x: tb.x + x, z: tb.z + z, color: jitterColor(tb.color, h, 0.04) };
            this.fx.add(blk);
            this.nature.push(blk);
          }
        } else if (roll < 0.1 && !blocked(x, z, 0)) {
          const kind = h();
          let blk;
          if (kind < 0.35) blk = { x, y: 0.85, z, color: jitterColor('#4f9a3c', h, 0.06), mat: 'leaves', shape: 'blob', s: 0.6 + h() * 0.4 };
          else if (kind < 0.55) blk = { x, y: 0.7, z, color: jitterColor('#8f97a3', h, 0.05), mat: 'rock', shape: 'rock', s: 0.5 + h() * 0.5 };
          else blk = { x: x + h() - 0.5, y: 0.62, z: z + h() - 0.5, color: ['#ff6f91', '#ffd34d', '#c77dff', '#ffffff', '#6fc3ff'][Math.floor(h() * 5)], mat: 'cloth', shape: 'orb', s: 0.45 };
          this.fx.add(blk);
          this.nature.push(blk);
        }
      }
  }

  footprint(b) {
    b._fp ||= (() => {
      const raw = b.kind === 'gate' ? gateBlocks() : blueprint(b.kind, 7);
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, front = 0;
      for (const q of raw) {
        const [x, z] = rotateXZ(q.x, q.z, b.rot);
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        z0 = Math.min(z0, z);
        z1 = Math.max(z1, z);
        front = Math.max(front, q.z);
      }
      return { x0, x1, z0, z1, front };
    })();
    return b._fp;
  }

  // ------------------------------------------------------------ buildings

  blocksFor(id) {
    const b = BUILDINGS[id];
    const raw = b.kind === 'gate' ? gateBlocks() : blueprint(b.kind, 7);
    const rng = mulberry32(hash2(this.seed, id.length * 31 + id.charCodeAt(0)));
    return raw.map((q) => {
      const [x, z] = rotateXZ(q.x, q.z, b.rot);
      const out = { x: b.x + x, y: q.y, z: b.z + z, color: jitterColor(q.color, rng, q.mat === 'glass' || q.mat === 'lantern' || q.mat === 'magic' ? 0.01 : 0.035), bid: id };
      if (q.mat) out.mat = q.mat;
      if (q.shape) out.shape = q.shape;
      if (q.r || b.rot) out.r = ((q.r || 0) + b.rot) % 4;
      if (q.s != null) out.s = q.s;
      return out;
    });
  }

  /** Show a building at a level. animate = drop it in block by block (returns the duration). */
  setBuilding(id, level, animate = false, onDone) {
    const cur = this.buildings[id];
    if (cur && cur.level === level) return 0;
    this.clearPlot(id);
    if (!cur) {
      const blocks = this.blocksFor(id);
      this.buildings[id] = { blocks, level };
      if (animate) {
        const stagger = Math.min(0.03, 4 / blocks.length);
        this.fx.many('drop', blocks, stagger, { velocity: 0.8 }, () => {
          this.addFlag(id, level, true);
          onDone?.();
        });
        return blocks.length * stagger + 0.7;
      }
      for (const b of blocks) this.fx.add(b);
      this.addFlag(id, level, false);
      return 0;
    }
    cur.level = level;
    this.addFlag(id, level, animate);
    if (animate) {
      this.fx.many('hop', cur.blocks.filter((_, i) => i % 3 === 0), 0.004, {}, onDone);
      return 1;
    }
    onDone?.();
    return 0;
  }

  /** Level banners on a pole beside the door: one pennant per level. */
  addFlag(id, level, animate) {
    const cur = this.buildings[id];
    if (!cur || id === 'gate') return;
    for (const f of cur.flags || []) this.fx.remove(f);
    const b = BUILDINGS[id];
    const [px, pz] = rotateXZ(b._fp.x1 > 3 ? 3.2 : 2.6, b._fp.front + 0.6, b.rot);
    const x = b.x + px;
    const z = b.z + pz;
    const flags = [];
    for (let y = 1; y <= 3; y++) flags.push({ x, y, z, color: '#6b4a2f', mat: 'wood', shape: 'post', bid: id });
    const cols = ['#ffcf3a', '#4ecbff', '#ff5a5a'];
    for (let i = 0; i < level; i++) flags.push({ x: x + 0.35, y: 3.3 - i * 0.55, z, color: cols[i], mat: 'cloth', shape: 'wedge', r: 1, s: [0.5, 0.45, 0.1], bid: id });
    cur.flags = flags;
    for (const f of flags) animate ? this.fx.drop(f, { height: 4, velocity: 0.5 }) : this.fx.add(f);
  }

  /** An empty plot: tilled earth and a little signpost. */
  setPlot(id) {
    if (this.buildings[id] || this.plots[id]) return;
    const b = BUILDINGS[id];
    const fp = this.footprint(b);
    const blocks = [];
    const rng = mulberry32(hash2(this.seed, 999 + id.length));
    // a tidy patch of cleared earth, pegged out at the corners, waiting for a building
    const X0 = Math.ceil(fp.x0), X1 = Math.floor(fp.x1), Z0 = Math.ceil(fp.z0), Z1 = Math.floor(fp.z1);
    for (let x = X0; x <= X1; x++)
      for (let z = Z0; z <= Z1; z++) {
        const edge = x === X0 || x === X1 || z === Z0 || z === Z1;
        blocks.push({ x: b.x + x, y: 0.57, z: b.z + z, color: jitterColor(edge ? '#8a6040' : '#a07450', rng, 0.05), mat: 'dirt', shape: 'slab', s: [1, 0.12, 1], deco: 1, bid: id });
      }
    for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) blocks.push({ x: b.x + x, y: 0.85, z: b.z + z, color: '#e8d2a8', mat: 'wood', shape: 'post', s: [0.7, 0.7, 0.7], bid: id });
    const [sx, sz] = rotateXZ(0, fp.front + 0.4, b.rot);
    blocks.push({ x: b.x + sx, y: 1, z: b.z + sz, color: '#7a5434', mat: 'wood', shape: 'post', bid: id });
    blocks.push({ x: b.x + sx, y: 1.6, z: b.z + sz, color: '#c9a46a', mat: 'wood', shape: 'pane', s: [1.2, 0.6, 0.6], r: b.rot, bid: id });
    for (const q of blocks) this.fx.add(q);
    this.plots[id] = blocks;
  }

  clearPlot(id) {
    for (const q of this.plots[id] || []) this.fx.remove(q);
    delete this.plots[id];
  }

  /** Building id under a screen ray, or null. */
  pick(raycaster) {
    const hit = this.fx.pickBlock(raycaster);
    return hit?.b?.bid || null;
  }

  /** Point above a building for labels. */
  labelPos(id) {
    const b = BUILDINGS[id];
    let h = 2.6;
    if (this.buildings[id]) {
      b._top ??= Math.max(...this.blocksFor(id).map((q) => q.y));
      h = b._top + 1.6;
    }
    return new THREE.Vector3(b.x, h, b.z);
  }

  // ------------------------------------------------------------ heroes at camp

  setHeroes(list, tiers) {
    for (const h of this.heroes) h.char.dispose();
    this.heroes = list.map((id, i) => {
      const char = new Character(this.charBatch, heroSpec(id, tiers[id] || 0));
      const a = (i / list.length) * Math.PI * 2 + 0.6;
      char.pos.set(Math.cos(a) * 2.6, 0.5, Math.sin(a) * 2.6 + 0.4);
      char.yaw = Math.atan2(-char.pos.x, -char.pos.z);
      return { id, char, idle: 1 + Math.random() * 3, path: null, seat: a };
    });
  }

  heroAt(id) {
    return this.heroes.find((h) => h.id === id);
  }

  cheer() {
    for (const h of this.heroes) h.char.play('cheer', { dur: 1.8 });
  }

  wanderSpot() {
    const opts = [];
    for (const [id, b] of Object.entries(BUILDINGS)) if (this.buildings[id] && b.door) opts.push(b.door);
    for (let i = 0; i < 4; i++) {
      const a = Math.random() * Math.PI * 2;
      opts.push([Math.cos(a) * (4 + Math.random() * 2), Math.sin(a) * (4 + Math.random() * 2)]);
    }
    const p = opts[Math.floor(Math.random() * opts.length)];
    return new THREE.Vector3(p[0] + (Math.random() - 0.5) * 1.5, 0.5, p[1] + (Math.random() - 0.5) * 1.5);
  }

  updateHeroes(dt) {
    const night = this.night > 0.55;
    for (const h of this.heroes) {
      const c = h.char;
      if (h.path) {
        const d = h.path.clone().sub(c.pos).setY(0);
        const dist = d.length();
        if (dist < 0.08) {
          h.path = null;
          c.moving = false;
          h.idle = 3 + Math.random() * 6;
          if (h.sitting) c.yaw = Math.atan2(-c.pos.x, -c.pos.z);
          else if (Math.random() < 0.3) c.play('wave', { dur: 1.2 });
        } else {
          d.normalize();
          c.pos.addScaledVector(d, Math.min(dist, dt * 1.5));
          c.yaw = Math.atan2(d.x, d.z);
          c.moving = true;
        }
      } else {
        h.idle -= dt;
        if (h.sitting && !c.action) c.play('sit', { dur: 4, loop: true });
        if (h.idle <= 0) {
          if (night) {
            h.sitting = true;
            h.path = new THREE.Vector3(Math.cos(h.seat) * 2.3, 0.5, Math.sin(h.seat) * 2.3);
          } else {
            if (h.sitting && c.action?.name === 'sit') c.action = null;
            h.sitting = false;
            h.path = this.wanderSpot();
          }
        }
      }
      c.update(dt);
    }
  }

  // ------------------------------------------------------------ per frame

  update(dt, night = 0) {
    this.time += dt;
    this.night = night;
    this.fx.update(dt);
    // campfire flicker + embers
    const f = 1 + 0.12 * Math.sin(this.time * 11) + 0.08 * Math.sin(this.time * 23);
    this.fx.pose(this.flame, this.flame.x, this.flame.y + 0.03 * Math.sin(this.time * 9), this.flame.z, f, 1 + 0.15 * Math.sin(this.time * 7), f);
    this.fireLight.intensity = (4 + night * 20) * f;
    this.smokeT = (this.smokeT || 0) - dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.35;
      this.fx.smoke((Math.random() - 0.5) * 0.3, 1.8, (Math.random() - 0.5) * 0.3);
    }
    this.updateHeroes(dt);
  }
}
