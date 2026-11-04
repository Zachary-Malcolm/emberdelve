import * as THREE from 'three';
import { IslandFX } from './islandfx.js';
import { jitterColor } from './voxels.js';
import { rngFor, pick } from './data.js';
import { BIOMES } from './enemies.js';
import { blueprint } from './blueprints.js';
import { hash2, mulberry32 } from './rng.js';

/*
 * The Underroot: every room is a floating chunk of cave hanging in the dark below the home
 * island. Rooms are rebuilt from (run seed, node id) so a resumed run shows the same room.
 * The fighting floor (|x| < 6.5, |z| < 3.2) is always clear; decor sits around the edges.
 * Block tops are at y = 0.5, so characters stand at y = 0.5.
 */

export const ARENA_Y = -140;
const RX = 10.5;
const RZ = 6.4;

export class Arena {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0, ARENA_Y, 0);
    scene.add(this.group);
    this.fx = new IslandFX(this.group);
    this.blocks = [];
    this.torches = [];
    this.time = 0;
    this.fires = [];
    // two warm torch lights; moved per room
    for (let i = 0; i < 2; i++) {
      const l = new THREE.PointLight(0xffb36b, 0, 16, 1.6);
      this.group.add(l);
      this.torches.push({ light: l, base: 0, x: 0, y: 0, z: 0 });
    }
  }

  get origin() {
    return this.group.position;
  }

  clear() {
    this.fx.finishAll();
    for (const b of this.blocks) this.fx.remove(b);
    this.blocks = [];
    this.fires = [];
    for (const t of this.torches) t.light.intensity = t.base = 0;
  }

  /** Build a room. kind: fight | elite | boss | rest | shop | event. */
  build(seed, biomeKey, nodeId, kind, { animate = true } = {}) {
    this.clear();
    const biome = BIOMES[biomeKey];
    this.biome = biome;
    const rng = rngFor(seed, 'room', nodeId);
    const blocks = [];
    const add = (x, y, z, color, o = {}) => blocks.push({ x, y, z, color: jitterColor(color, rng, o.j ?? 0.05), ...o });
    const p1 = rng() * 6.28;
    const p2 = rng() * 6.28;
    const big = kind === 'boss' ? 1.15 : 1;
    const edge = (a) => 1 + 0.07 * Math.sin(3 * a + p1) + 0.05 * Math.sin(5 * a + p2);

    // floor + rocky underside (buried blocks skipped)
    const depthAt = new Map();
    const cols = [];
    for (let x = -12; x <= 12; x++)
      for (let z = -8; z <= 8; z++) {
        const a = Math.atan2(z / RZ, x / RX);
        const d = Math.hypot(x / (RX * big), z / (RZ * big)) / edge(a);
        if (d > 1) continue;
        const cell = mulberry32(hash2(seed ^ 0x51, (x + 64) * 256 + z + 64));
        const t = 1 - d;
        const depth = 2 + Math.round(Math.pow(t, 1.1) * 7 + cell() * 1.5);
        depthAt.set(`${x},${z}`, depth);
        cols.push([x, z, depth, cell]);
      }
    const dAt = (x, z) => depthAt.get(`${x},${z}`) || 0;
    for (const [x, z, depth, cell] of cols) {
      const shallow = Math.min(dAt(x + 1, z), dAt(x - 1, z), dAt(x, z + 1), dAt(x, z - 1));
      const n = Math.sin(x * 0.7 + p1) + Math.cos(z * 0.9 + p2) + (cell() - 0.5);
      for (let k = 0; k < depth; k++) {
        if (k >= 1 && k < depth - 1 && k < shallow) continue;
        if (k === 0) add(x, 0, z, n > 1.0 ? pick(cell, biome.floor2) : pick(cell, biome.floor), { mat: biomeKey === 'hollow' ? (n > 1 ? 'dirt' : 'moss') : n > 1 ? 'stone' : 'rock' });
        else add(x, -k, z, pick(cell, biome.wall), { mat: 'rock' });
      }
    }

    // back wall: pillars and broken wall pieces
    const wallZ = -5;
    for (let x = -9; x <= 9; x += 3 + Math.floor(rng() * 2)) {
      if (!dAt(x, wallZ)) continue;
      const h = 2 + Math.floor(rng() * 4);
      const broken = rng() < 0.35;
      for (let y = 1; y <= (broken ? Math.max(1, h - 2) : h); y++) add(x, y, wallZ, pick(rng, biome.wall), { mat: 'stone', shape: y === 1 ? 'cube' : 'pillar' });
      if (!broken) add(x, h + 1, wallZ, pick(rng, biome.wall), { mat: 'stone', shape: 'slab', s: [1.3, 1, 1.3] });
      else add(x + 0.6, 1, wallZ + 1, pick(rng, biome.wall), { mat: 'rock', shape: 'rock', s: 0.55, deco: 1 });
      if (rng() < 0.6) {
        const w = x + 1 + Math.floor(rng() * 2);
        if (dAt(w, wallZ)) add(w, 1, wallZ, pick(rng, biome.wall), { mat: 'stone' });
      }
    }

    // edge decor, never on the fighting floor
    const spots = [];
    for (const [x, z] of cols.map((c) => [c[0], c[1]])) {
      const inFloor = Math.abs(x) < 7 && Math.abs(z) < 3.6;
      const rim = dAt(x + 1, z) && dAt(x - 1, z) && dAt(x, z + 1) && dAt(x, z - 1);
      if (!inFloor && rim && z !== wallZ) spots.push([x, z]);
    }
    const decor = biomeKey === 'hollow' ? hollowDecor : grottoDecor;
    for (const [x, z] of spots) if (rng() < (z > 3 ? 0.3 : 0.42)) decor(add, rng, x, z, z > 0.5); // only low things in front of the camera

    // braziers at the back corners
    const tx = 7.5;
    this.torches.forEach((t, i) => {
      const x = i ? tx : -tx;
      const z = -3.8;
      add(x, 1, z, '#5d6470', { mat: 'metal', shape: 'post', s: [1.4, 1, 1.4] });
      add(x, 2, z, '#5d6470', { mat: 'metal', shape: 'post', s: [1.4, 1, 1.4] });
      add(x, 2.75, z, '#3a3f4a', { mat: 'metal', shape: 'slab', s: [1.3, 0.8, 1.3] });
      add(x, 3.05, z, '#ff9a3c', { mat: 'ember', shape: 'blob', s: 0.55, j: 0.1 });
      this.fires.push({ x, y: 3.5, z });
      t.light.position.set(x, 4, z + 0.6);
      t.light.color.set(biome.light);
      t.base = 18;
    });

    // the centrepiece of non-fight rooms
    if (kind === 'rest') campfire(add, 0, 0.6, this.fires);
    if (kind === 'shop') {
      for (const b of blueprint('stall', 11)) add(b.x, b.y, b.z - 3.6, b.color, { mat: b.mat, shape: b.shape, r: b.r, s: b.s, j: 0.03 });
    }
    if (kind === 'event') shrine(add, rng, biome);

    this.blocks = blocks;
    if (animate) {
      // the floor assembles from left to right, decor drops in after it
      const order = blocks.slice().sort((a, b) => a.y - b.y + (a.x - b.x) * 0.02);
      order.sort((a, b) => (a.y <= 0 && b.y <= 0 ? a.x - b.x : a.y <= 0 ? -1 : b.y <= 0 ? 1 : a.y - b.y));
      const floor = order.filter((b) => b.y <= 0);
      const rest = order.filter((b) => b.y > 0);
      floor.forEach((b, i) => {
        if (b.y < -1) this.fx.add(b); // the deep rock just appears (it's under the floor)
        else this.fx.drop(b, { delay: (b.x + 12) * 0.035 + rng() * 0.05, height: 6, velocity: 0.35 });
        void i;
      });
      rest.forEach((b, i) => this.fx.drop(b, { delay: 0.75 + i * 0.006, height: 8, velocity: 0.5 }));
    } else for (const b of blocks) this.fx.add(b);
  }

  update(dt) {
    this.time += dt;
    this.fx.update(dt);
    for (const t of this.torches) if (t.base) t.light.intensity = t.base * (0.85 + 0.1 * Math.sin(this.time * 9 + t.light.position.x) + 0.06 * Math.sin(this.time * 23));
    // embers drift up from fires
    this.emberT = (this.emberT || 0) - dt;
    if (this.emberT < 0 && this.fires.length) {
      this.emberT = 0.12;
      const f = pick(Math.random, this.fires);
      this.fx.smoke(f.x + (Math.random() - 0.5) * 0.4, f.y, f.z + (Math.random() - 0.5) * 0.4);
    }
  }
}

function hollowDecor(add, rng, x, z, low = false) {
  const r = low ? 0.5 + rng() * 0.5 : rng();
  if (r < 0.28) {
    // toadstool
    const h = 1 + Math.floor(rng() * 2);
    for (let y = 1; y <= h; y++) add(x, y, z, '#efe2c4', { mat: 'plaster', shape: 'pillar', s: [0.5, 1, 0.5] });
    add(x, h + 0.75, z, pick(rng, ['#e0533a', '#8d5fc4', '#e0533a']), { mat: 'cloth', shape: 'dome', s: [1.6 + h * 0.3, 0.7, 1.6 + h * 0.3] });
  } else if (r < 0.5) add(x, 0.85, z, pick(rng, ['#4f9a3c', '#62c04a', '#3f7d3a']), { mat: 'leaves', shape: 'blob', s: 0.6 + rng() * 0.5, deco: 1 });
  else if (r < 0.62) add(x, 0.7, z, pick(rng, ['#7a7468', '#6f6a5e']), { mat: 'rock', shape: 'rock', s: 0.6 + rng() * 0.6, deco: 1 });
  else if (r < 0.78) {
    add(x, 0.75, z, '#9fe38a', { mat: 'magic', shape: 'orb', s: 0.5, deco: 1 });
    add(x, 0.6, z, '#efe2c4', { mat: 'plaster', shape: 'post', s: [0.6, 0.3, 0.6], deco: 1 });
  } else if (r < 0.9) add(x, 0.75, z, '#6b4a2f', { mat: 'log', shape: 'logx', r: Math.floor(rng() * 4), s: [1.6, 0.6, 0.6], deco: 1 });
  else add(x, 0.6, z, pick(rng, ['#ff8fb1', '#ffd34d', '#ffffff']), { mat: 'cloth', shape: 'orb', s: 0.5, deco: 1 });
}

function grottoDecor(add, rng, x, z, low = false) {
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

function campfire(add, x, z, fires) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(x + Math.cos(a) * 1.1, 0.65, z + Math.sin(a) * 1.1, '#8f97a3', { mat: 'rock', shape: 'rock', s: 0.5 });
  }
  add(x, 0.75, z, '#6b4a2f', { mat: 'log', shape: 'logx', s: [1.4, 0.45, 0.45], r: 0 });
  add(x, 0.95, z, '#7a5434', { mat: 'log', shape: 'logx', s: [1.4, 0.45, 0.45], r: 1 });
  add(x, 1.35, z, '#ff9a3c', { mat: 'ember', shape: 'spire', s: [0.9, 1.1, 0.9], j: 0.1 });
  add(x, 1.2, z, '#ffd34d', { mat: 'ember', shape: 'blob', s: 0.45, j: 0.1 });
  fires.push({ x, y: 1.8, z });
}

function shrine(add, rng, biome) {
  const z = -3.4;
  add(0, 1, z, biome.wall[0], { mat: 'stone', s: [2.2, 1, 1.4] });
  add(0, 2, z, biome.wall[1], { mat: 'stone', s: [1.6, 1, 1] });
  add(0, 2.9, z, biome.wall[2], { mat: 'stone', shape: 'slab', s: [2, 0.6, 1.2] });
  add(0, 3.6, z, biome.accent, { mat: 'magic', shape: 'orb', s: 1.4, j: 0.02 });
  for (const sx of [-1, 1]) add(sx * 1.6, 0.75, z + 0.6, '#4f9a3c', { mat: 'leaves', shape: 'blob', s: 0.6, deco: 1 });
  void rng;
}
