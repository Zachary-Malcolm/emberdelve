import * as THREE from 'three';
import { MultiBatch } from './kit.js';
import { Character } from './chars.js';
import { heroSpec } from './heroes.js';
import { enemySpec, ENEMIES } from './enemies.js';

// Little head-and-shoulders portraits for the UI, rendered once into data URLs.
let r = null;
const cache = new Map();

function setup() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x8a7a6a, 1.9));
  const sun = new THREE.DirectionalLight(0xfff3dc, 2.4);
  sun.position.set(3, 5, 6);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  r = { renderer, scene, camera };
}

/** id: hero id (or enemy id with enemy = true). size in px. */
export function portrait(id, tier = 0, size = 128, enemy = false) {
  const key = `${id}:${tier}:${size}:${enemy}`;
  if (cache.has(key)) return cache.get(key);
  if (!r) setup();
  const { renderer, scene, camera } = r;
  renderer.setSize(size, size, false);
  const batch = new MultiBatch(scene, { shadows: false });
  const spec = enemy ? enemySpec(id) : heroSpec(id, tier);
  const c = new Character(batch, spec, { scale: enemy ? ENEMIES[id].scale : 1, phase: 0 });
  c.yaw = 0.35;
  c.t = 0;
  c.blinkAt = 99;
  c.update(0);
  const h = c.height;
  const focus = enemy ? h * 0.55 : 1.05;
  const dist = enemy ? h * 2.6 + 1 : 2.9;
  camera.position.set(0.55, focus + 0.35, dist);
  camera.lookAt(0, focus, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  c.dispose();
  batch.dispose();
  cache.set(key, url);
  return url;
}
