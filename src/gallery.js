// Dev tool: every hero and enemy in a lineup, with buttons to play each animation.
// Open /gallery.html on the dev server. ?set=heroes|<biome key>  &tier=0..2  &charm=<rarity>  &yaw=radians
import * as THREE from 'three';
import { createScene } from './scene.js';
import { MultiBatch } from './kit.js';
import { Character } from './chars.js';
import { heroSpec, HEROES } from './heroes.js';
import { enemySpec, ENEMIES, biomeEnemies } from './enemies.js';
import { RARITY } from './items.js';

const q = new URLSearchParams(location.search);
const set = q.get('set') || 'heroes';
const tier = +(q.get('tier') || 0);
const charm = q.get('charm') && RARITY[q.get('charm')] ? { color: RARITY[q.get('charm')].color, rank: RARITY[q.get('charm')].rank } : null; // &charm=rare etc.
const view = createScene(document.getElementById('scene'));
view.camera.setViewOffset(innerWidth, innerHeight, 0, 0, innerWidth, innerHeight);
const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 20), new THREE.MeshStandardMaterial({ color: '#8fc46a', roughness: 1 }));
ground.position.y = -0.5;
ground.receiveShadow = true;
view.scene.add(ground);
const batch = new MultiBatch(view.scene);

const ids = (set === 'heroes' ? Object.keys(HEROES) : biomeEnemies(set)).filter((id) => !q.get('only') || q.get('only').split(',').includes(id)); // &only=a,b
const chars = [];
let x = 0;
const gap = set === 'heroes' ? 2.1 : 3.4;
ids.forEach((id, i) => {
  const isHero = !!HEROES[id];
  const spec = isHero ? heroSpec(id, tier, charm) : enemySpec(id);
  const c = new Character(batch, spec, { scale: isHero ? 1 : ENEMIES[id].scale });
  c.pos.set((i - (ids.length - 1) / 2) * gap, 0, 0);
  c.yaw = +(q.get('yaw') || 0.35);
  c.id = id;
  chars.push(c);
  x++;
});
const span = ids.length * gap;
view.controls.target.set(0, set === 'heroes' ? 0.9 : 1.4, 0);
view.camera.position.set(0, set === 'heroes' ? 2.6 : 4, span * 0.95 + 2);
view.controls.minDistance = 2;
view.controls.update();

const ACT = { bulwark: 'slash', ranger: 'shoot', sage: 'cast', keeper: 'heal', duskblade: 'stab', tinker: 'throw' };
const bar = document.getElementById('bar');
const btn = (label, fn) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = fn;
  bar.append(b);
};
btn('Attack', () => chars.forEach((c) => c.play(ACT[c.id] || ENEMIES[c.id]?.attack || 'slash', { dur: 0.8 })));
btn('Hurt', () => chars.forEach((c) => c.hurt(1)));
btn('KO', () => chars.forEach((c) => ((c.ko = !c.ko), (c.koT = 0))));
btn('Cheer', () => chars.forEach((c) => c.play('cheer', { dur: 2.4 })));
btn('Walk', () => chars.forEach((c) => (c.moving = !c.moving)));
btn('Spawn', () => chars.forEach((c, i) => c.spawn(i * 0.12)));
btn('Shatter', () => chars.forEach((c) => c.shatter()));
window.gal = { chars, view };

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  for (const c of chars) c.update(dt);
  view.controls.update();
  view.renderer.render(view.scene, view.camera);
  requestAnimationFrame(frame);
}
frame();
