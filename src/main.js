import * as THREE from 'three';
import './style.css';
import { createScene } from './scene.js';
import { Sky, WEATHER } from './sky.js';
import { CameraRig } from './rig.js';
import { MultiBatch, tickMaterials, setNight } from './kit.js';
import * as sfx from './audio.js';
import { unlockAudio, setMuted, setMusic, setAmbience, setMood } from './audio.js';
import { Base, BUILDINGS } from './base.js';
import { Arena, ARENA_Y } from './arena.js';
import { BattleFX } from './fx.js';
import { Battle, heroFormation, FLOOR_Y, MAX_SPARKS, layout, faceFor } from './battle.js';
import { Character } from './chars.js';
import { heroSpec, HEROES, RECRUITS } from './heroes.js';
import { BIOMES, ENEMIES } from './enemies.js';
import { ABILITIES, RELICS, EVENTS, STARTING_CARDS, MAX_CARDS, ROWS, NODE_INFO, makeMap, encounterFor, rngFor, pick, shuffle } from './data.js';
import { load, store, wipe } from './save.js';
import { randomSeed, hash2 } from './rng.js';
import { portrait } from './portraits.js';
import { icon } from './icons.js';
import { RARITY, chestLoot, itemIcon, effectText, statLines, STASH } from './items.js';
import { chestSpec } from './chest.js';
import { journalBody, journalNote } from './journal.js';

// ---------------------------------------------------------------- setup

const $ = (id) => document.getElementById(id);
const save = load();
const persist = () => store(save);

const view = createScene($('scene'));
const sky = new Sky(view, save.sky, persist);
const rig = new CameraRig(view.camera, view.controls);
const base = new Base(view.scene, save.seed);
const arena = new Arena(view.scene);
const arenaChars = new MultiBatch(arena.group);
const overlay = $('overlay');
const bfx = new BattleFX(arena.group, overlay, view.camera, arena.group.position);
view.controls.maxDistance = 140;

let state = 'camp';
let battle = null;
let party = {}; // hero id -> Character standing in the arena during a delve
let busyTravel = false;

const CAMP = {
  target: new THREE.Vector3(0, 1.2, 0),
  // pulled back further on tall phone screens so the whole island fits across
  get dist() {
    const a = view.camera.aspect;
    return 46 * (a < 1 ? Math.pow(1 / a, 0.4) : 1);
  },
};
function arenaStation() {
  // Wide screens look at the fight side-on (heroes left, enemies right). Tall phones look from
  // behind the heroes instead (heroes at the bottom, enemies at the top), so the line of battle
  // runs up the screen and the characters can be big.
  const a = view.camera.aspect;
  const fov = THREE.MathUtils.degToRad(view.camera.fov);
  const halfW = Math.atan(Math.tan(fov / 2) * a);
  const portraitMode = a < 0.9;
  layout.portrait = portraitMode;
  layout.x = portraitMode ? 0.85 : 1;
  if (portraitMode) {
    const dist = (3.9 / Math.tan(halfW)) * Math.pow(a, 0.75); // rig.pose re-scales portrait distances
    return { target: new THREE.Vector3(0.2, ARENA_Y + 0.6, 0), dir: new THREE.Vector3(-1, 0.95, 0.06).normalize(), dist };
  }
  const dist = Math.max(19, 9 / Math.tan(halfW));
  return { target: new THREE.Vector3(0, ARENA_Y + 0.9, 0.4), dir: new THREE.Vector3(0, 0.6, 1).normalize(), dist };
}

window.addEventListener('resize', () => {
  if (state === 'camp' || !save.run) return;
  const was = layout.portrait;
  rig.snap(arenaStation());
  // turned the phone between rooms: rebuild the room and line the party up the new way
  if (was !== layout.portrait && !battle && !busyTravel && save.run.at !== undefined) {
    arena.build(save.run.seed, save.run.biome, save.run.at || 'start', save.run.at ? nodeById(save.run.at).type : 'start', { animate: false, portrait: layout.portrait });
    if (!['rest'].includes(state)) placeParty();
  }
});

// ---------------------------------------------------------------- small UI helpers

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

let toastTimer = 0;
function toast(msg, ms = 2600) {
  const t = $('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function setEmbers(n, flash = false) {
  $('embers').textContent = n;
  if (flash) {
    const p = $('ember-pill');
    p.classList.remove('bump');
    void p.offsetWidth;
    p.classList.add('bump');
  }
}

function addEmbers(n) {
  if (!n) return;
  save.embers += n;
  save.stats.embersEarned += n;
  if (save.run) save.run.embers += n;
  setEmbers(save.embers, true);
  sfx.coin();
}

const _pv = new THREE.Vector3();
/** World position -> overlay pixels (camp labels, hero taps). */
function project(pos, out) {
  _pv.copy(pos).project(view.camera);
  out.x = ((_pv.x + 1) / 2) * overlay.clientWidth;
  out.y = ((1 - _pv.y) / 2) * overlay.clientHeight;
  out.behind = _pv.z > 1;
  return out;
}

let sheetClose = null;
/** One reusable sheet for every dialog. */
function openSheet({ title, note = '', body, closable = true, onClose = null, wide = false, tone = '' }) {
  $('sheet-title').textContent = title;
  $('sheet-note').innerHTML = note;
  const b = $('sheet-body');
  b.innerHTML = '';
  if (body) b.append(body);
  $('sheet-close').hidden = !closable;
  $('sheet').hidden = false;
  $('sheet').querySelector('.sheet').className = `sheet ${wide ? 'wide' : ''} ${tone}`;
  sheetClose = closable ? onClose || (() => closeSheet()) : null;
  requestAnimationFrame(() => $('sheet').classList.add('open'));
}
function closeSheet() {
  $('sheet').classList.remove('open');
  $('sheet').hidden = true;
  sheetClose = null;
}
$('sheet-close').onclick = () => sheetClose?.();
$('sheet').addEventListener('pointerdown', (e) => {
  if (e.target === $('sheet') && sheetClose) sheetClose();
});

function fade(on) {
  $('fade').classList.toggle('on', on);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// waits measured in rendered game time, so walking and floors finish even if frames are throttled
const gameTimers = [];
const after = (ms) => new Promise((r) => gameTimers.push({ t: ms / 1000, r }));
function tickTimers(dt) {
  for (let i = gameTimers.length - 1; i >= 0; i--) {
    gameTimers[i].t -= dt;
    if (gameTimers[i].t <= 0) gameTimers.splice(i, 1)[0].r();
  }
}

// ---------------------------------------------------------------- hero stats

/** The trinket a hero wears, or null. */
function itemOf(heroId) {
  const uid = save.equip[heroId];
  return uid ? save.items.find((i) => i.uid === uid) || null : null;
}
function holderOf(uid) {
  return Object.keys(save.equip).find((k) => save.equip[k] === uid) || null;
}
/** The worn trinket as a little charm on the hero model. */
function charmOf(id) {
  const it = itemOf(id);
  return it ? { color: RARITY[it.rarity].color, rank: RARITY[it.rarity].rank } : null;
}
function charms() {
  return Object.fromEntries(save.roster.map((id) => [id, charmOf(id)]));
}
function campHeroes() {
  base.setHeroes(save.party, save.gear, charms());
}

// Hero levels carry over between delves: +2.5% health and power per level, up to level 10.
const MAX_LEVEL = 10;
function levelInfo(id) {
  let xp = save.xp[id] || 0;
  let level = 1;
  let need = 40;
  while (level < MAX_LEVEL && xp >= need) {
    xp -= need;
    level++;
    need = 40 + 30 * (level - 1);
  }
  return { level, into: xp, need: level >= MAX_LEVEL ? 0 : need };
}
const levelMul = (id) => 1 + 0.025 * (levelInfo(id).level - 1);

/** Experience for everyone in the party; returns who levelled up. */
function awardXp(n) {
  const ups = [];
  for (const h of save.run.heroes) {
    const before = levelInfo(h.id).level;
    save.xp[h.id] = (save.xp[h.id] || 0) + n;
    const after = levelInfo(h.id).level;
    if (after > before) ups.push({ id: h.id, level: after });
  }
  if (ups.length) refreshMaxHp();
  return ups;
}

function celebrateLevels(ups) {
  ups.forEach((u, i) =>
    after(500 + i * 450).then(() => {
      const c = party[u.id];
      if (!c) return;
      bfx.text(c.pos.clone().setY(c.pos.y + c.height + 0.3), `Level ${u.level}!`, 'heal');
      bfx.rise(c.pos, '#ffd34d', 16, 0.8);
      bfx.ring(c.pos, '#ffd34d', 1.4, 14);
      c.play('cheer', { dur: 1.2 });
      sfx.complete();
    }),
  );
}

function xpBar(id) {
  const L = levelInfo(id);
  return `<div class="xp-row"><b class="lv">Lv ${L.level}</b><div class="xp-bar"><i style="width:${L.need ? (L.into / L.need) * 100 : 100}%"></i></div><small>${L.need ? `${L.into}/${L.need} XP` : 'Max level'}</small></div>`;
}

function heroStats(h) {
  const d = HEROES[h.id];
  const g = (1 + 0.15 * (save.gear[h.id] || 0)) * levelMul(h.id);
  const it = itemOf(h.id)?.stats || {};
  const relics = new Set(save.run?.relics || []);
  const maxHp = Math.round(d.hp * g * (1 + (it.hp || 0)) * (1 + (h.trainHp || 0)) * (1 + (h.tough || 0)) * (relics.has('bark') ? 1.15 : 1));
  const atk = d.atk * g * (1 + (it.atk || 0)) * (1 + (h.trainAtk || 0));
  return { maxHp, atk, spd: d.spd / (1 + (it.spd || 0)) };
}

/** Keep current health in step when max health changes (relics, training). */
function refreshMaxHp() {
  for (const h of save.run.heroes) {
    const { maxHp } = heroStats(h);
    if (h.maxHp && maxHp > h.maxHp && h.hp > 0) h.hp += maxHp - h.maxHp;
    h.maxHp = maxHp;
    h.hp = Math.min(h.hp ?? maxHp, maxHp);
  }
}

function runMods() {
  const r = new Set(save.run.relics);
  const spire = save.built.spire || 0;
  return {
    atkMul: r.has('flint') ? 1.15 : 1,
    spdMul: r.has('feather') ? 1.1 : 1,
    critBonus: r.has('clover') ? 0.1 : 0,
    healMul: r.has('tea') ? 1.25 : 1,
    abilityMul: r.has('pebble') ? 1.25 : 1,
    bossMul: r.has('crown') ? 1.25 : 1,
    thorns: r.has('mirror') ? 0.2 : 0,
    startSparks: (r.has('jar') ? 3 : 0) + (spire >= 1 ? 2 : 0),
    regenMul: (spire >= 2 ? 1.2 : 1) * (r.has('bellows') ? 1.15 : 1),
    startShield: r.has('kettle') ? 0.08 : 0,
    enemySpd: r.has('mask') ? 0.92 : 1,
    freeFirst: r.has('moth'),
    enemyBurn: r.has('emberheart'),
  };
}

// ---------------------------------------------------------------- camp

function setupCamp() {
  for (const id of Object.keys(BUILDINGS)) {
    if (save.built[id]) base.setBuilding(id, save.built[id]);
    else base.setPlot(id);
  }
  campHeroes();
  renderCampPanel();
  makeTags();
}

const tags = {};
function makeTags() {
  for (const id of Object.keys(BUILDINGS)) {
    let t = tags[id];
    if (!t) {
      t = tags[id] = el('button', 'tag');
      t.onclick = () => openBuilding(id);
      $('tags').append(t);
    }
    const b = BUILDINGS[id];
    const lvl = save.built[id] || 0;
    t.classList.toggle('plot', !lvl);
    t.innerHTML = lvl ? `${b.name}${b.costs.length > 1 ? ` <small>Lv ${lvl}</small>` : ''}` : `${b.name} <small>${icon('ember')}${b.costs[0]}</small>`;
  }
}

function updateTags() {
  const show = state === 'camp' && !rig.flying;
  $('tags').hidden = !show;
  if (!show) return;
  const p = { x: 0, y: 0 };
  for (const [id, t] of Object.entries(tags)) {
    project(base.labelPos(id), p);
    t.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    t.hidden = p.behind;
  }
}

function renderCampPanel() {
  const strip = $('party-strip');
  strip.innerHTML = '';
  for (const id of save.party) {
    const d = HEROES[id];
    const c = el('button', 'hero-chip');
    c.innerHTML = `<img alt="" src="${portrait(id, save.gear[id] || 0, 96)}"><span><b>${d.name}</b><small>Lv ${levelInfo(id).level} · ${d.cls}</small></span>`;
    c.style.setProperty('--hc', d.color);
    c.onclick = () => openHero(id);
    strip.append(c);
  }
  setEmbers(save.embers);
  const st = save.stats;
  $('camp-note').textContent = st.runs ? `Delves: ${st.runs} · Bosses beaten: ${st.bossesBeaten} · Deepest: ${st.best}/${ROWS + 1}` : 'Your little camp above the Underroot.';
}

function openHero(id) {
  const d = HEROES[id];
  const tier = save.gear[id] || 0;
  const g = 1 + 0.15 * tier;
  const st = heroStats({ id });
  const body = el('div', 'hero-sheet');
  body.innerHTML = `
    <img class="hero-big" alt="" src="${portrait(id, tier, 192)}">
    <div class="hero-info">
      ${xpBar(id)}
      <p>${d.blurb}</p>
      <div class="stat-row"><span>Health</span><b>${st.maxHp}</b></div>
      <div class="stat-row"><span>Power</span><b>${Math.round(st.atk)}</b></div>
      <div class="stat-row"><span>Speed</span><b>${(1 / st.spd).toFixed(2)} /s</b></div>
      <div class="stat-row"><span>Gear</span><b>${['Plain', 'Polished', 'Glowing'][tier]}</b></div>
      <p class="muted">${d.role === 'front' ? 'Fights up front.' : 'Fights from the back row.'} Levels come from battles (+2.5% health and power each). ${save.built.forge ? 'Upgrade gear at the Forge.' : 'Build the Forge to upgrade gear.'}</p>
    </div>`;
  void g;
  const it = itemOf(id);
  const slot = el('button', `trinket-slot ${it ? `r-${it.rarity}` : 'empty'}`);
  slot.innerHTML = it
    ? `${itemTileIcon(it)}<span><b>${it.name}</b><small>${RARITY[it.rarity].name} · ${[...statLines(it), effectText(it)].filter(Boolean).join(' · ')}</small></span>`
    : `${icon('chest', '#b9b2a4')}<span><b>No trinket</b><small>Elites and bosses drop chests. Give trinkets out at the Storehouse.</small></span>`;
  slot.onclick = () => openBuilding('storehouse');
  body.append(slot);
  openSheet({ title: `${d.name} the ${d.cls}`, body });
}

function buildingAction(id) {
  const b = BUILDINGS[id];
  const lvl = save.built[id] || 0;
  const cost = b.costs[lvl];
  if (cost == null || save.embers < cost) return;
  save.embers -= cost;
  save.built[id] = lvl + 1;
  persist();
  setEmbers(save.embers, true);
  closeSheet();
  sfx.purchase();
  rig.fly({ target: new THREE.Vector3(b.x, 2, b.z), dist: 30 }, 1.1, () => {
    const t = base.setBuilding(id, lvl + 1, true, () => {
      sfx.complete();
      base.cheer();
      toast(lvl ? `${b.name} is now level ${lvl + 1}!` : `${b.name} built!`);
      makeTags();
    });
    setTimeout(() => rig.fly(CAMP, 1.4), Math.max(800, t * 1000 + 900));
  });
}

function openBuilding(id) {
  if (state !== 'camp') return;
  sfx.uiTick();
  const b = BUILDINGS[id];
  const lvl = save.built[id] || 0;
  const body = el('div', 'bld');
  const note = b.text;
  if (id === 'gate') {
    body.append(el('p', '', `Seeded floors, branching paths and a boss waits at the bottom. Every delve is different.`));
    const bi = el('div', 'biome-row');
    const choose = (k) => {
      save.gateBiome = k;
      persist();
      sfx.uiTick();
      openBuilding('gate');
    };
    const any = el('button', `biome-chip ${save.gateBiome === 'any' ? 'on' : ''}`, 'Surprise me');
    any.onclick = () => choose('any');
    bi.append(any);
    for (const k of Object.keys(BIOMES)) {
      if (save.biomes.includes(k)) {
        const c = el('button', `biome-chip ${save.gateBiome === k ? 'on' : ''}`, BIOMES[k].name);
        c.style.setProperty('--bc', BIOMES[k].accent);
        c.onclick = () => choose(k);
        bi.append(c);
      } else {
        bi.append(el('span', 'biome-chip locked', '??? · beat a boss'));
        break; // only hint at the next one
      }
    }
    body.append(bi);
    const go = el('button', 'btn btn-go', 'Start a delve');
    go.onclick = () => (closeSheet(), startRun());
    body.append(go);
    const d = dailyState();
    const daily = el('div', 'daily');
    daily.innerHTML = `${icon('calendar', '#7fc8ff')}<div><b>Daily delve</b><small>One map for the whole day, a new one tomorrow. ${d.cleared ? 'Cleared today!' : `First clear today: ${icon('ember')} +25.`} ${d.tries ? `Best floor ${d.best}/${ROWS + 1} · ${d.tries} ${d.tries === 1 ? 'try' : 'tries'}.` : ''}${d.streak ? ` Streak: ${d.streak}.` : ''}</small></div>`;
    const dgo = el('button', 'btn btn-soft', 'Go');
    dgo.onclick = () => (closeSheet(), startRun({ daily: true }));
    daily.append(dgo);
    body.append(daily);
    return openSheet({ title: b.name, note, body });
  }
  if (!lvl || lvl < b.costs.length) {
    const cost = b.costs[lvl];
    const btn = el('button', 'btn btn-go', `${lvl ? `Upgrade to level ${lvl + 1}` : 'Build it'} · ${icon('ember')} ${cost}`);
    btn.disabled = save.embers < cost;
    btn.onclick = () => buildingAction(id);
    if (save.embers < cost) body.append(el('p', 'muted', `You need ${cost - save.embers} more embers. Delves earn embers, even when the party has to retreat.`));
    body.append(btn);
  }
  if (lvl && id === 'forge') body.prepend(forgeBody());
  if (lvl && id === 'storehouse') body.prepend(stashBody());
  if (lvl && id === 'tavern') body.prepend(tavernBody());
  if (lvl && b.costs.length > 1) body.prepend(el('p', 'level-line', `Level ${lvl} of ${b.costs.length}`));
  openSheet({ title: b.name, note, body });
}

function forgeBody() {
  const wrap = el('div', 'list');
  const COST = [25, 60];
  for (const id of save.roster) {
    const d = HEROES[id];
    const tier = save.gear[id] || 0;
    const row = el('div', 'row');
    row.innerHTML = `<img alt="" src="${portrait(id, tier, 72)}"><div class="grow"><b>${d.name}</b><small>${['Plain', 'Polished', 'Glowing'][tier]} gear · +${tier * 15}% health and power</small></div>`;
    if (tier < 2) {
      const b = el('button', 'btn btn-soft small', `${tier ? 'Enchant' : 'Polish'} · ${icon('ember')} ${COST[tier]}`);
      b.disabled = save.embers < COST[tier];
      b.onclick = () => {
        save.embers -= COST[tier];
        save.gear[id] = tier + 1;
        persist();
        setEmbers(save.embers, true);
        sfx.purchase();
        campHeroes();
        const h = base.heroAt(id);
        if (h) {
          h.char.spawn(0);
          setTimeout(() => h.char.play('cheer', { dur: 1.5 }), 700);
        }
        renderCampPanel();
        openBuilding('forge');
      };
      row.append(b);
    } else row.append(el('span', 'done', 'Max'));
    wrap.append(row);
  }
  return wrap;
}

// ---------------------------------------------------------------- trinkets (Storehouse)

function stashCap() {
  return STASH[Math.min(STASH.length - 1, save.built.storehouse || 1)];
}

function itemTileIcon(it, size = '') {
  return `<span class="item-ico r-${it.rarity} ${size}">${icon(itemIcon(it), RARITY[it.rarity].color)}</span>`;
}

/**
 * Put chest loot into the Storehouse. When it is full, the weakest spare trinket (not worn by anyone)
 * is melted to make room if the new one is rarer; otherwise the new one is melted into embers.
 */
function stashLoot(items) {
  for (const it of items) {
    save.seen.items[it.rarity] = (save.seen.items[it.rarity] || 0) + 1;
    if (it.effect) save.seen.items['fx:' + it.effect] = true;
    if (save.items.length < stashCap()) {
      save.items.push(it);
      continue;
    }
    const worn = new Set(Object.values(save.equip));
    const spare = save.items.filter((x) => !worn.has(x.uid)).sort((a, b) => RARITY[a.rarity].rank - RARITY[b.rarity].rank)[0];
    if (spare && RARITY[spare.rarity].rank < RARITY[it.rarity].rank) {
      save.items = save.items.filter((x) => x !== spare);
      save.items.push(it);
      it.replaced = { name: spare.name, melt: RARITY[spare.rarity].melt };
      addEmbers(it.replaced.melt);
    } else {
      it.melted = RARITY[it.rarity].melt;
      addEmbers(it.melted);
    }
  }
  return items;
}

function stashBody() {
  const wrap = el('div', 'stash');
  const cap = stashCap();
  wrap.append(el('p', 'muted', `${save.items.length} of ${cap} spaces used. Elites and bosses drop chests; tap a trinket to give it to a hero.`));
  const grid = el('div', 'item-grid');
  const sorted = save.items.slice().sort((a, b) => RARITY[b.rarity].rank - RARITY[a.rarity].rank);
  for (const it of sorted) {
    const t = el('button', `item-tile r-${it.rarity}`);
    const who = holderOf(it.uid);
    t.innerHTML = `${icon(itemIcon(it), RARITY[it.rarity].color)}${who ? `<img class="worn" alt="" src="${portrait(who, save.gear[who] || 0, 48)}">` : ''}`;
    t.title = it.name;
    t.onclick = () => openItem(it.uid);
    grid.append(t);
  }
  for (let i = sorted.length; i < cap; i++) grid.append(el('span', 'item-tile empty'));
  wrap.append(grid);
  return wrap;
}

function openItem(uid) {
  const it = save.items.find((i) => i.uid === uid);
  if (!it) return openBuilding('storehouse');
  const r = RARITY[it.rarity];
  const body = el('div', 'item-sheet');
  const head = el('div', 'item-head');
  head.innerHTML = `${itemTileIcon(it, 'big')}<div><span class="rarity-tag r-${it.rarity}">${r.name}</span><ul class="item-stats">${statLines(it)
    .map((l) => `<li>${l}</li>`)
    .join('')}${it.effect ? `<li class="effect">${effectText(it)}</li>` : ''}</ul></div>`;
  body.append(head);
  body.append(el('p', 'muted', 'Give it to:'));
  const heroes = el('div', 'give-row');
  const who = holderOf(uid);
  for (const id of save.roster) {
    const b = el('button', `give ${who === id ? 'on' : ''}`);
    const other = itemOf(id);
    b.innerHTML = `<img alt="" src="${portrait(id, save.gear[id] || 0, 72)}"><small>${HEROES[id].name}</small>${other && other.uid !== uid ? `<i class="has r-${other.rarity}"></i>` : ''}`;
    b.onclick = () => {
      if (who === id) delete save.equip[id];
      else {
        if (who) delete save.equip[who];
        save.equip[id] = uid;
        toast(`${HEROES[id].name} wears the ${it.name}.`);
      }
      persist();
      campHeroes();
      if (who !== id) base.heroAt(id)?.char.play('cheer', { dur: 1.2 });
      sfx.uiTick();
      openItem(uid);
    };
    heroes.append(b);
  }
  body.append(heroes);
  const melt = el('button', 'btn btn-soft small melt', `Melt down · ${icon('ember')} +${r.melt}`);
  melt.onclick = () => {
    if (!melt.dataset.armed && (r.rank >= 2 || who)) {
      melt.dataset.armed = '1';
      melt.innerHTML = `Tap again to melt it for ${icon('ember')} ${r.melt}`;
      return;
    }
    save.items = save.items.filter((i) => i.uid !== uid);
    if (who) delete save.equip[who];
    addEmbers(r.melt);
    persist();
    if (who) campHeroes();
    openBuilding('storehouse');
  };
  body.append(melt);
  openSheet({ title: it.name, body, onClose: () => openBuilding('storehouse'), tone: `item r-${it.rarity}` });
}

/** Loot cards for the reward and end-of-delve sheets. */
function lootBlock(items) {
  const wrap = el('div', 'chest-loot');
  for (const it of items) {
    const r = RARITY[it.rarity];
    const row = el('div', `found item-found r-${it.rarity}`);
    row.innerHTML = `${itemTileIcon(it)}<div><span class="rarity-tag r-${it.rarity}">${r.name}</span><b>${it.name}</b><small>${[...statLines(it), effectText(it)].filter(Boolean).join(' · ')}</small>${
      it.melted
        ? `<small class="melted">Storehouse full: melted into ${icon('ember')} ${it.melted}.</small>`
        : it.replaced
          ? `<small class="melted">Storehouse full: your ${it.replaced.name} was melted to make room (${icon('ember')} ${it.replaced.melt}).</small>`
          : ''
    }</div>`;
    wrap.append(row);
  }
  if (items.some((it) => !it.melted)) wrap.append(el('p', 'muted center small-note', 'Sent home to the Storehouse. Hand trinkets out at camp.'));
  return wrap;
}

function tavernBody() {
  const wrap = el('div', 'list');
  wrap.append(el('p', 'muted', 'Tap heroes to choose who goes on the next delve (up to 4).'));
  for (const id of Object.keys(HEROES)) {
    const d = HEROES[id];
    const owned = save.roster.includes(id);
    const row = el('div', `row ${owned ? '' : 'locked'}`);
    row.innerHTML = `<img alt="" src="${portrait(id, save.gear[id] || 0, 72)}"><div class="grow"><b>${d.name} · ${d.cls}</b><small>${d.blurb}</small></div>`;
    if (owned) {
      const inParty = save.party.includes(id);
      const t = el('button', `btn small ${inParty ? 'btn-go' : 'btn-soft'}`, inParty ? 'In party' : 'Resting');
      t.onclick = () => {
        if (inParty && save.party.length > 1) save.party = save.party.filter((x) => x !== id);
        else if (!inParty && save.party.length < 4) save.party.push(id);
        else if (!inParty) return toast('The party is full (4 heroes).');
        persist();
        sfx.uiTick();
        campHeroes();
        renderCampPanel();
        openBuilding('tavern');
      };
      row.append(t);
    } else {
      const cost = RECRUITS[id];
      const b = el('button', 'btn btn-soft small', `Recruit · ${icon('ember')} ${cost}`);
      b.disabled = save.embers < cost;
      b.onclick = () => {
        save.embers -= cost;
        save.roster.push(id);
        if (save.party.length < 4) save.party.push(id);
        persist();
        setEmbers(save.embers, true);
        sfx.purchase();
        campHeroes();
        const h = base.heroAt(id);
        if (h) h.char.spawn(0.2);
        toast(`${d.name} the ${d.cls} joins the camp!`);
        renderCampPanel();
        openBuilding('tavern');
      };
      row.append(b);
    }
    wrap.append(row);
  }
  return wrap;
}

function openCampList() {
  const wrap = el('div', 'list');
  for (const [id, b] of Object.entries(BUILDINGS)) {
    const lvl = save.built[id] || 0;
    const row = el('button', 'row row-btn');
    const status = id === 'gate' ? 'Start a delve' : lvl ? (b.costs.length > 1 ? `Level ${lvl}/${b.costs.length}` : 'Built') : `${icon('ember')} ${b.costs[0]} to build`;
    row.innerHTML = `<div class="grow"><b>${b.name}</b><small>${b.text}</small></div><span class="status">${status}</span>`;
    row.onclick = () => openBuilding(id);
    wrap.append(row);
  }
  openSheet({ title: 'Camp', note: 'Spend embers from your delves on buildings. Tap a building on the island too.', body: wrap });
}

$('camp-btn').onclick = () => openCampList();
$('delve-btn').onclick = () => startRun();

// ---------------------------------------------------------------- settings

function openSettings() {
  const body = el('div', 'settings');
  const row = (label, ctl) => {
    const r = el('div', 'set-row');
    r.append(el('span', '', label), ctl);
    return r;
  };
  const toggle = (on, fn) => {
    const b = el('button', `mini-chip ${on ? 'on' : ''}`, on ? 'On' : 'Off');
    b.onclick = fn;
    return b;
  };
  body.append(row('Music', toggle(save.music, () => ((save.music = !save.music), setMusic(save.music), persist(), openSettings()))));
  body.append(row('Sound', toggle(!save.muted, () => ((save.muted = !save.muted), setMuted(save.muted), persist(), openSettings()))));
  const times = el('div', 'chips');
  for (const [label, h] of [['Live', null], ['Morning', 8], ['Noon', 12.5], ['Dusk', 18.6], ['Night', 22.5]]) {
    const on = h == null ? save.sky.live : !save.sky.live && Math.abs(save.sky.hour - h) < 0.3;
    const b = el('button', `mini-chip ${on ? 'on' : ''}`, label);
    b.onclick = () => {
      save.sky.live = h == null;
      if (h != null) save.sky.hour = h;
      persist();
      openSettings();
    };
    times.append(b);
  }
  body.append(row('Time at camp', times));
  const wx = el('div', 'chips');
  for (const k of ['auto', 'clear', 'fair', 'rain', 'snow', 'fog']) {
    const b = el('button', `mini-chip ${save.sky.weather === k ? 'on' : ''}`, k === 'auto' ? 'Auto' : WEATHER[k].label);
    b.onclick = () => {
      save.sky.weather = k;
      persist();
      openSettings();
    };
    wx.append(b);
  }
  body.append(row('Weather', wx));
  const reset = el('button', 'btn btn-soft small danger', 'Start over…');
  reset.onclick = () => {
    if (reset.dataset.armed) {
      wipe();
      location.reload();
    } else {
      reset.dataset.armed = '1';
      reset.textContent = 'Tap again to erase everything';
    }
  };
  body.append(row('Save', reset));
  openSheet({ title: 'Settings', note: 'Your camp is saved in this browser.', body });
}
$('settings-btn').onclick = () => openSettings();

function openJournal(tab = 'creatures') {
  if (state !== 'camp') return;
  sfx.uiTick();
  openSheet({ title: 'Journal', note: journalNote(save), body: journalBody(save, tab, openJournal), wide: true });
}
$('book-btn').onclick = () => openJournal();
$('sound-btn').onclick = () => {
  save.muted = !save.muted;
  setMuted(save.muted);
  persist();
  $('sound-btn').classList.toggle('off', save.muted);
};
$('sound-btn').classList.toggle('off', save.muted);
setMuted(save.muted);

// ---------------------------------------------------------------- dungeon lighting

function dungeonLight(on) {
  const run = save.run;
  if (on && run) {
    const b = BIOMES[run.biome];
    const root = document.documentElement.style;
    root.setProperty('--sky-top', b.sky[0]);
    root.setProperty('--sky-mid', b.sky[1]);
    root.setProperty('--sky-bottom', b.sky[2]);
    document.documentElement.dataset.night = '1';
    view.hemi.intensity = 1.25;
    view.hemi.color.set('#c8d4f0');
    view.hemi.groundColor.set('#4a3e30');
    view.sun.intensity = 2.0;
    view.sun.color.set(b.light);
    view.sun.position.set(-7, ARENA_Y + 18, 12);
    view.sun.target.position.set(0, ARENA_Y, 0);
    view.scene.fog.color.set(b.fog);
    view.scene.fog.near = 30;
    view.scene.fog.far = 90;
    sky.starMat.opacity = 0;
    sky.rain.mesh.count = 0;
    sky.snow.mesh.count = 0;
    setNight(0.6);
    setAmbience({ rain: 0, wind: 0.25, day: 0.2, clear: 0 });
  }
}

// ---------------------------------------------------------------- the delve

function partyIds() {
  return save.run.heroes.map((h) => h.id);
}

function makeParty() {
  for (const c of Object.values(party)) c.dispose();
  party = {};
  for (const h of save.run.heroes) {
    const c = new Character(arenaChars, heroSpec(h.id, save.gear[h.id] || 0, charmOf(h.id)));
    party[h.id] = c;
  }
  placeParty();
}

function placeParty(offsetX = 0) {
  const homes = heroFormation(partyIds());
  for (const h of save.run.heroes) {
    const c = party[h.id];
    c.pos.copy(homes[h.id]).add(new THREE.Vector3(offsetX, 0, 0));
    c.yaw = faceFor('hero', homes[h.id]);
    c.ko = h.hp <= 0;
    c.moving = false;
  }
}

// ---------------------------------------------------------------- daily delve

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Today's record (rolls over at local midnight; a missed day ends the streak). */
function dailyState() {
  const d = save.daily;
  const today = dayKey();
  if (d.date !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (d.lastClear !== dayKey(y) && d.lastClear !== today) d.streak = 0;
    Object.assign(d, { date: today, best: 0, cleared: false, tries: 0 });
  }
  return d;
}
const dailySeed = (date) => [...`emberdelve:${date}`].reduce((h, c) => hash2(h, c.charCodeAt(0)), 0x2545f491);

function startRun({ daily = false } = {}) {
  if (state !== 'camp') return;
  const seed = daily ? dailySeed(dayKey()) : randomSeed();
  const rng = rngFor(seed, 'start');
  const chosen = save.gateBiome !== 'any' && save.biomes.includes(save.gateBiome) ? save.gateBiome : null;
  const biome = daily ? pick(rngFor(seed, 'biome'), save.biomes) : chosen || pick(rng, save.biomes);
  if (daily) dailyState().tries++;
  save.run = {
    daily: daily ? dayKey() : null,
    seed,
    biome,
    map: makeMap(seed),
    at: null,
    done: [],
    gold: 0,
    embers: 0,
    fights: 0,
    cards: STARTING_CARDS.map((id) => ({ id, level: 1 })),
    relics: [],
    seenEvents: [],
    heroes: save.party.map((id) => ({ id, hp: null, maxHp: 0, trainAtk: 0, trainHp: 0, tough: 0 })),
    pending: null,
  };
  if (save.built.archive) save.run.relics.push(pick(rng, Object.keys(RELICS)));
  refreshMaxHp();
  save.stats.runs++;
  persist();
  sfx.startSound();
  base.cheer();
  state = 'descend';
  $('camp-panel').hidden = true;
  $('book-btn').hidden = true;
  setTimeout(() => descend(), 700);
}

function descend(resume = false) {
  state = 'descend';
  fade(true);
  setTimeout(() => {
    const station = arenaStation(); // also sets the formation squeeze for this screen
    arena.build(save.run.seed, save.run.biome, save.run.at || 'start', save.run.at ? nodeById(save.run.at).type : 'start', { animate: true, portrait: layout.portrait });
    makeParty();
    Object.values(party).forEach((c, i) => c.spawn(1.0 + i * 0.15));
    dungeonLight(true);
    setMood('delve');
    rig.snap(station);
    dungeonCamera(true);
    fade(false);
    $('gold-pill').hidden = false;
    $('gold').textContent = save.run.gold;
    setTimeout(() => {
      state = 'map';
      if (save.run.over) runOver(save.run.over === 'win', true);
      else if (save.run.pending) resumePending();
      else showMap();
    }, resume ? 1300 : 1900);
  }, 500);
}

/** In the dungeon the camera can orbit and zoom around the arena too; the eye button re-frames it. */
function dungeonCamera(on) {
  const c = view.controls;
  c.enabled = true;
  c.minDistance = on ? 6 : 18;
  c.maxDistance = on ? 60 : 140;
  c.maxPolarAngle = on ? 1.2 : 1.45; // no peeking under the floor chunk
  $('view-btn').hidden = !on;
}
$('view-btn').onclick = () => {
  sfx.uiTick();
  rig.fly(arenaStation(), 0.6);
};

function nodeById(id) {
  return save.run.map.nodes.find((n) => n.id === id);
}

function available() {
  const run = save.run;
  if (!run.at) return run.map.nodes.filter((n) => n.r === 0);
  return nodeById(run.at).next.map(nodeById);
}

// ---------------------------------------------------------------- map screen

const NODE_ICON = { fight: 'sword', elite: 'skull', event: 'question', shop: 'coin', rest: 'flame', boss: 'crown' };

function showMap() {
  state = 'map';
  const run = save.run;
  const m = $('map');
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('open'));
  $('map-biome').textContent = BIOMES[run.biome].name;
  $('map-depth').textContent = `${run.daily ? 'Daily delve · ' : ''}Floor ${run.at ? nodeById(run.at).r + 1 : 0} of ${ROWS + 1}`;
  // party health
  const ph = $('map-party');
  ph.innerHTML = '';
  for (const h of run.heroes) {
    const d = HEROES[h.id];
    const k = Math.max(0, h.hp / h.maxHp);
    const chip = el('div', `mp-hero ${h.hp <= 0 ? 'down' : ''}`);
    chip.innerHTML = `<img alt="" src="${portrait(h.id, save.gear[h.id] || 0, 72)}"><b class="lv">${levelInfo(h.id).level}</b><div class="mp-bar"><i style="width:${k * 100}%"></i></div><small>${Math.round(h.hp)}/${h.maxHp}</small>`;
    chip.title = d.name;
    ph.append(chip);
  }
  // relics + cards
  const rr = $('map-relics');
  rr.innerHTML = '';
  for (const id of run.relics) {
    const r = RELICS[id];
    const chip = el('span', 'relic-chip', icon(r.icon, r.color));
    chip.title = `${r.name}: ${r.text}`;
    chip.onclick = () => toast(`<b>${r.name}</b> · ${r.text}`);
    rr.append(chip);
  }
  for (const c of run.cards) {
    const a = ABILITIES[c.id];
    const chip = el('span', 'card-chip', `${icon(a.icon, a.color)}<small>${'+'.repeat(c.level - 1)}</small>`);
    chip.onclick = () => toast(`<b>${a.name}${c.level > 1 ? ` +${c.level - 1}` : ''}</b> · ${a.cost} sparks · ${a.text(a.power[c.level - 1])}`);
    rr.append(chip);
  }

  // the node graph
  const W = 500;
  const rowH = 92;
  const H = (ROWS + 1) * rowH + 70;
  const pos = (n) => {
    const j = rngFor(run.seed, 'pos', n.id);
    return n.id === 'boss' ? [W / 2, 52] : [62 + n.c * 94 + (j() - 0.5) * 26, H - 50 - n.r * rowH + (j() - 0.5) * 16];
  };
  const avail = new Set(available().map((n) => n.id));
  const done = new Set(run.done);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="map-svg" role="img" aria-label="Delve map">`;
  for (const n of run.map.nodes)
    for (const k of n.next) {
      const a = pos(n);
      const b = pos(nodeById(k));
      const walked = done.has(n.id) && (done.has(k) || avail.has(k));
      svg += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="edge ${walked ? 'walked' : ''}" />`;
    }
  for (const n of run.map.nodes) {
    const [x, y] = pos(n);
    const cls = done.has(n.id) ? 'done' : avail.has(n.id) ? 'avail' : run.at === n.id ? 'here' : '';
    const r = n.id === 'boss' ? 34 : 24;
    svg += `<g class="node ${cls} t-${n.type}" data-id="${n.id}" transform="translate(${x} ${y})"><circle r="${r}" class="node-bg" /><g transform="scale(${n.id === 'boss' ? 1.5 : 1.05}) translate(-12 -12)">${icon(NODE_ICON[n.type], null, true)}</g></g>`;
  }
  svg += '</svg>';
  const box = $('map-svg-box');
  box.innerHTML = svg;
  box.querySelectorAll('.node.avail').forEach((g) =>
    g.addEventListener('click', () => {
      sfx.uiTick();
      travelTo(nodeById(g.dataset.id));
    }),
  );
  // scroll so the available row is visible
  const first = box.querySelector('.node.avail');
  if (first) setTimeout(() => first.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  $('map-legend').innerHTML = Object.entries(NODE_INFO)
    .map(([k, v]) => `<span class="lg t-${k}">${icon(NODE_ICON[k], null, true)}${v.label}</span>`)
    .join('');
}

function hideMap() {
  $('map').classList.remove('open');
  $('map').hidden = true;
}

$('map-home').onclick = () => {
  const b = $('map-home');
  if (!b.dataset.armed) {
    b.dataset.armed = '1';
    b.textContent = 'Tap to confirm';
    setTimeout(() => {
      delete b.dataset.armed;
      b.textContent = 'Go home';
    }, 2500);
    return;
  }
  delete b.dataset.armed;
  b.textContent = 'Go home';
  runOver(false);
};

$('map-peek').onclick = () => {
  const m = $('map');
  m.classList.toggle('peek');
  $('map-peek').textContent = m.classList.contains('peek') ? 'Show map' : 'Look around';
};

// ---------------------------------------------------------------- moving between rooms

async function travelTo(node) {
  if (busyTravel) return;
  busyTravel = true;
  hideMap();
  state = 'travel';
  // walk off to the right
  for (const c of Object.values(party)) if (!c.ko) (c.moving = true), (c.yaw = Math.PI / 2);
  walkParty(9, 0.9);
  await after(650);
  fade(true);
  await wait(380);
  clearChest();
  arena.build(save.run.seed, save.run.biome, node.id, node.type, { animate: true, portrait: layout.portrait });
  placeParty(-11);
  fade(false);
  // walk in from the left while the floor assembles
  for (const c of Object.values(party)) c.moving = !c.ko;
  const homes = heroFormation(partyIds());
  walkTo(homes, 1.5);
  if (node.type === 'boss') setMood('boss');
  await after(1700);
  busyTravel = false;
  enterNode(node);
}

let walking = null;
function walkParty(dx, dur) {
  const from = {};
  const to = {};
  for (const [id, c] of Object.entries(party)) {
    from[id] = c.pos.clone();
    to[id] = c.pos.clone().add(new THREE.Vector3(dx, 0, 0));
  }
  walking = { from, to, t: 0, dur };
}
function walkTo(homes, dur) {
  const from = {};
  for (const [id, c] of Object.entries(party)) {
    from[id] = c.pos.clone();
    if (c.ko) c.pos.copy(homes[id]);
  }
  walking = { from, to: homes, t: 0, dur };
}
function stepWalking(dt) {
  if (!walking) return;
  walking.t += dt;
  const k = Math.min(1, walking.t / walking.dur);
  for (const [id, c] of Object.entries(party)) {
    if (c.ko) continue;
    c.pos.lerpVectors(walking.from[id], walking.to[id], k);
    c.pos.y = FLOOR_Y;
  }
  if (k >= 1) {
    const done = walking;
    walking = null;
    for (const [id, c] of Object.entries(party)) {
      c.moving = false;
      c.yaw = faceFor('hero', done.to[id] || c.pos);
    }
  }
}

function enterNode(node) {
  const run = save.run;
  if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') return startBattle(node);
  if (node.type === 'rest') return openRest(node);
  if (node.type === 'shop') {
    run.pending = { node: node.id, kind: 'shop', items: shopItems(node) };
    persist();
    return openShop(node);
  }
  if (node.type === 'event') {
    const rng = rngFor(run.seed, 'event', node.id);
    const pool = EVENTS.filter((e) => !run.seenEvents.includes(e.id));
    const ev = pick(rng, pool.length ? pool : EVENTS);
    run.seenEvents.push(ev.id);
    run.pending = { node: node.id, kind: 'event', event: ev.id };
    persist();
    return openEvent(node, ev);
  }
}

function markDone(node) {
  const run = save.run;
  run.at = node.id;
  if (!run.done.includes(node.id)) run.done.push(node.id);
  run.pending = null;
  save.stats.best = Math.max(save.stats.best, node.id === 'boss' ? ROWS + 1 : node.r + 1);
}

function completeNode(node) {
  const run = save.run;
  markDone(node);
  persist();
  $('gold').textContent = run.gold;
  closeSheet();
  if (node.type !== 'boss') setMood('delve');
  setTimeout(() => showMap(), 250);
}

function resumePending() {
  const p = save.run.pending;
  const node = nodeById(p.node);
  if (p.kind === 'reward') return openReward(node);
  if (p.kind === 'shop') return openShop(node);
  if (p.kind === 'event') {
    const ev = EVENTS.find((e) => e.id === p.event);
    return p.outcome ? showEventOutcome(node, ev, p.outcome) : openEvent(node, ev);
  }
  showMap();
}

// ---------------------------------------------------------------- battle

function startBattle(node) {
  const run = save.run;
  state = 'battle';
  if (walking) stepWalking(walking.dur); // never start a fight with heroes still walking in
  const enc = encounterFor(run.seed, run.biome, node, Math.min(save.stats.bossesBeaten, 4));
  for (const id of enc.ids) save.seen.met[id] = true;
  const heroes = run.heroes.map((h) => {
    const st = heroStats(h);
    const it = itemOf(h.id);
    const gear = it ? { crit: it.stats.crit || 0, guard: it.stats.guard || 0, effect: it.effect || null } : {};
    return { id: h.id, hp: h.hp, maxHp: st.maxHp, atk: st.atk, spd: st.spd, char: party[h.id], ref: h, gear };
  });
  battle = new Battle({
    charBatch: arenaChars,
    fx: bfx,
    heroes,
    enemyIds: enc.ids,
    level: enc.level,
    cards: run.cards,
    mods: runMods(),
    ui: { overlay: $('bars'), bossBar: $('boss-bar') },
    kind: node.type,
    onEnd: (result) => endBattle(node, result, heroes),
    onChange: () => {},
    onKill: (id) => {
      save.seen.met[id] = true;
      save.seen.beaten[id] = (save.seen.beaten[id] || 0) + 1;
    },
  });
  battle.speed = save.speed || 1;
  battle.auto = !!save.auto;
  renderBattlePanel();
  $('battle-panel').hidden = false;
  if (node.type === 'boss' || node.type === 'elite') {
    const e = ENEMIES[enc.ids[0]];
    toast(node.type === 'boss' ? `<b>${e.name}</b> blocks the way down!` : `An elite: <b>${e.name}</b>`, 2200);
  }
}

function renderBattlePanel() {
  const cards = $('cards');
  cards.innerHTML = '';
  battle.cards.forEach((c, i) => {
    const a = ABILITIES[c.id];
    const b = el('button', 'acard');
    b.style.setProperty('--cc', a.color);
    b.innerHTML = `<span class="ac-cost">${a.cost}</span><span class="ac-ico">${icon(a.icon, a.color)}</span><span class="ac-name">${a.name}${c.level > 1 ? ` <i>+${c.level - 1}</i>` : ''}</span><span class="ac-fill"></span>`;
    b.title = a.text(a.power[c.level - 1]);
    b.onclick = () => {
      if (battle?.cast(i)) {
        b.classList.remove('fired');
        void b.offsetWidth;
        b.classList.add('fired');
      } else if (battle) {
        b.classList.remove('nope');
        void b.offsetWidth;
        b.classList.add('nope');
      }
    };
    cards.append(b);
  });
  const meter = $('spark-meter');
  meter.innerHTML = '';
  for (let i = 0; i < MAX_SPARKS; i++) meter.append(el('i', 'pip'));
  $('speed-btn').textContent = `${battle.speed}x`;
  $('auto-btn').classList.toggle('on', battle.auto);
}

function updateBattlePanel() {
  if (!battle) return;
  const pips = $('spark-meter').children;
  for (let i = 0; i < pips.length; i++) {
    const k = Math.max(0, Math.min(1, battle.sparks - i));
    pips[i].style.setProperty('--k', k);
    pips[i].classList.toggle('full', k >= 1);
  }
  $('spark-count').textContent = Math.floor(battle.sparks);
  const btns = $('cards').children;
  battle.cards.forEach((c, i) => {
    const b = btns[i];
    if (!b) return;
    const cost = battle.cardCost(c);
    const ready = battle.canCast(i);
    b.classList.toggle('ready', ready);
    b.querySelector('.ac-cost').textContent = cost;
    b.querySelector('.ac-fill').style.transform = `scaleY(${Math.min(1, battle.sparks / Math.max(1, cost))})`;
  });
}

$('speed-btn').onclick = () => {
  if (!battle) return;
  battle.speed = battle.speed === 1 ? 2 : 1;
  save.speed = battle.speed;
  persist();
  $('speed-btn').textContent = `${battle.speed}x`;
  sfx.uiTick();
};
$('auto-btn').onclick = () => {
  if (!battle) return;
  battle.auto = !battle.auto;
  save.auto = battle.auto;
  persist();
  $('auto-btn').classList.toggle('on', battle.auto);
  sfx.uiTick();
};
window.addEventListener('keydown', (e) => {
  if (!battle || e.repeat) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 5) $('cards').children[n - 1]?.click();
});

function endBattle(node, result, heroes) {
  const run = save.run;
  battle.dispose();
  for (const h of heroes) h.ref.hp = h.hp;
  battle = null;
  $('battle-panel').hidden = true;
  if (result === 'lose') return runOver(false);
  // after a win: knocked-out heroes get back up, some relics/buildings heal
  const relics = new Set(run.relics);
  for (const h of run.heroes) {
    if (h.hp <= 0) h.hp = Math.round(h.maxHp * 0.3);
    let heal = 0;
    if (relics.has('hearth')) heal += 0.1;
    if ((save.built.garden || 0) >= 2) heal += 0.08;
    h.hp = Math.min(h.maxHp, Math.round(h.hp + h.maxHp * heal));
    party[h.id].ko = false;
  }
  run.fights++;
  const r = rngFor(run.seed, 'loot', node.id);
  const gold = Math.round((node.type === 'boss' ? 60 : node.type === 'elite' ? 32 : 12 + node.r * 1.5 + r() * 6) * (relics.has('acorn') ? 1.35 : 1)) + (relics.has('map') ? 6 : 0);
  const embers = node.type === 'boss' ? 30 : node.type === 'elite' ? 10 : 4 + Math.floor(node.r / 2);
  run.gold += gold;
  addEmbers(embers);
  const tier = BIOMES[run.biome].tier || 0;
  const xp = Math.round((node.type === 'boss' ? 60 : node.type === 'elite' ? 25 : 10) * (1 + 0.25 * tier));
  const ups = awardXp(xp);
  run.xp = (run.xp || 0) + xp;
  run.ups = [...(run.ups || []), ...ups];
  celebrateLevels(ups);
  let chestKind = node.type === 'boss' || node.type === 'elite' ? node.type : null;
  if (!chestKind && relics.has('key') && r() < 0.12) chestKind = 'elite'; // Rusty Key: a small chest
  const found = chestKind ? stashLoot(chestLoot(rngFor(run.seed, 'chest', node.id), chestKind, tier)) : [];
  if (node.type === 'boss') {
    markDone(node);
    run.chest = found;
    return runOver(true, false, playChest(chestKind, found));
  }
  const relic = node.type === 'elite' ? newRelic(r) : null;
  if (relic) {
    run.relics.push(relic);
    refreshMaxHp();
  }
  run.pending = { node: node.id, kind: 'reward', gold, embers, xp, ups, relic, items: found, options: rewardOptions(r) };
  persist();
  $('gold').textContent = run.gold;
  if (chestKind) playChest(chestKind, found).then(() => openReward(node));
  else setTimeout(() => openReward(node), 300);
}

// ---------------------------------------------------------------- the loot chest

let chestChar = null;
const chestLight = new THREE.PointLight(0xffd36b, 0, 9, 1.6);
arena.group.add(chestLight);

function clearChest() {
  chestChar?.dispose();
  chestChar = null;
  chestLight.intensity = 0;
}

/** A chest drops between the lines, rattles, pops open and the trinkets fly out. */
async function playChest(kind, items) {
  state = 'chest';
  clearChest();
  const col = RARITY[items[0].rarity].color;
  const c = new Character(arenaChars, chestSpec(kind, col), { scale: kind === 'boss' ? 1.75 : 1.4 });
  c.pos.set(0.6 * layout.x, FLOOR_Y, layout.portrait ? 0 : 1.0);
  c.yaw = layout.portrait ? -Math.PI / 2 + 0.3 : -0.3;
  c.spawn(0.35);
  chestChar = c;
  for (const h of Object.values(party)) if (!h.ko) (h.yaw = Math.atan2(c.pos.x - h.pos.x, c.pos.z - h.pos.z)), h.play('cheer', { dur: 1 });
  await after(800);
  sfx.slam();
  bfx.burst(c.pos.clone().setY(0.6), '#d8c8a8', 10, { speed: 2.5, up: 1.5, life: 0.5, size: 0.16, mat: 'plaster' });
  await after(700);
  c.openAt = c.t;
  sfx.bash();
  await after(700);
  // the lid flings open
  const top = c.pos.clone().setY(c.height * 0.75 + FLOOR_Y);
  chestLight.color.set(col);
  chestLight.position.copy(top);
  chestLight.intensity = 9;
  bfx.burst(top, col, 26, { speed: 3.4, up: 5, life: 0.9, size: 0.2 });
  bfx.ring(c.pos, col, kind === 'boss' ? 2.8 : 2.2);
  bfx.rise(c.pos, col, 18, 0.9);
  sfx.card('aoe');
  if (RARITY[items[0].rarity].rank >= 3) setTimeout(() => sfx.victory(), 250);
  items.forEach((it, i) => {
    const icol = RARITY[it.rarity].color;
    const to = top.clone().add(new THREE.Vector3((i - (items.length - 1) / 2) * 1.4, 2.2, 0.6));
    bfx.shoot('orb', top, to, { dur: 0.55, arc: 1.2, color: icol, onHit: () => (bfx.burst(to, icol, 14, { speed: 2.4, up: 1, life: 0.7, size: 0.16 }), bfx.text(to, RARITY[it.rarity].name, 'info')) });
  });
  for (const h of Object.values(party)) if (!h.ko) h.play('cheer', { dur: 1.6 });
  await after(1500);
}

function newRelic(rng) {
  const have = new Set(save.run.relics);
  const pool = Object.keys(RELICS).filter((k) => !have.has(k));
  return pool.length ? pick(rng, pool) : null;
}

function choiceCount() {
  return 3 + (save.run.relics.includes('compass') ? 1 : 0) + ((save.built.spire || 0) >= 3 ? 1 : 0);
}

/** Reward choices: a new ability, an upgrade, or training for a hero. */
function rewardOptions(rng) {
  const run = save.run;
  const owned = new Set(run.cards.map((c) => c.id));
  const opts = [];
  const fresh = shuffle(rng, Object.keys(ABILITIES).filter((k) => !owned.has(k)));
  const upg = shuffle(rng, run.cards.filter((c) => c.level < 3).map((c) => c.id));
  const heroes = shuffle(rng, run.heroes.map((h) => h.id));
  const n = choiceCount();
  if (fresh.length && run.cards.length < MAX_CARDS) opts.push({ type: 'card', id: fresh.shift() });
  if (upg.length) opts.push({ type: 'upgrade', id: upg.shift() });
  opts.push({ type: 'train', id: heroes.shift() });
  while (opts.length < n) {
    const roll = rng();
    if (roll < 0.4 && fresh.length && run.cards.length < MAX_CARDS) opts.push({ type: 'card', id: fresh.shift() });
    else if (roll < 0.75 && upg.length) opts.push({ type: 'upgrade', id: upg.shift() });
    else if (heroes.length) opts.push({ type: 'train', id: heroes.shift() });
    else if (fresh.length) opts.push({ type: 'card', id: fresh.shift() });
    else break;
  }
  return shuffle(rng, opts);
}

function optionCard(o) {
  const b = el('button', 'choice');
  if (o.type === 'card' || o.type === 'upgrade') {
    const a = ABILITIES[o.id];
    const lvl = o.type === 'upgrade' ? save.run.cards.find((c) => c.id === o.id).level + 1 : 1;
    b.style.setProperty('--cc', a.color);
    b.innerHTML = `<span class="ch-kind">${o.type === 'card' ? 'New ability' : 'Upgrade'}</span><span class="ch-ico">${icon(a.icon, a.color)}</span><b>${a.name}${lvl > 1 ? ` +${lvl - 1}` : ''}</b><small>${a.cost} sparks · ${a.text(a.power[lvl - 1])}</small>`;
  } else if (o.type === 'train') {
    const d = HEROES[o.id];
    b.style.setProperty('--cc', d.color);
    b.innerHTML = `<span class="ch-kind">Training</span><img alt="" src="${portrait(o.id, save.gear[o.id] || 0, 72)}"><b>${d.name} trains</b><small>+15% power and +10% health for the rest of this delve.</small>`;
  } else if (o.type === 'relic') {
    const r = RELICS[o.id];
    b.style.setProperty('--cc', r.color);
    b.innerHTML = `<span class="ch-kind">Relic</span><span class="ch-ico">${icon(r.icon, r.color)}</span><b>${r.name}</b><small>${r.text}</small>`;
  }
  return b;
}

function applyOption(o) {
  const run = save.run;
  if (o.type === 'card') run.cards.push({ id: o.id, level: 1 });
  else if (o.type === 'upgrade') run.cards.find((c) => c.id === o.id).level++;
  else if (o.type === 'train') {
    const h = run.heroes.find((x) => x.id === o.id);
    h.trainAtk += 0.15;
    h.trainHp += 0.1;
    refreshMaxHp();
    party[o.id]?.play('cheer', { dur: 1.4 });
  } else if (o.type === 'relic') {
    run.relics.push(o.id);
    refreshMaxHp();
  }
}

function openReward(node) {
  state = 'reward';
  const p = save.run.pending;
  const body = el('div', 'reward');
  const loot = el('div', 'loot');
  loot.innerHTML = `<span class="pill gold">${icon('coin', '#ffcf45')} +${p.gold}</span><span class="pill ember">${icon('ember')} +${p.embers}</span>${p.xp ? `<span class="pill xp">+${p.xp} XP</span>` : ''}`;
  body.append(loot);
  if (p.ups?.length) body.append(el('p', 'level-ups center', p.ups.map((u) => `<b>${HEROES[u.id].name}</b> reached level ${u.level}!`).join(' ')));
  if (p.relic) {
    const r = RELICS[p.relic];
    body.append(el('div', 'found', `${icon(r.icon, r.color)}<div><b>Found: ${r.name}</b><small>${r.text}</small></div>`));
  }
  if (p.items?.length) body.append(lootBlock(p.items));
  body.append(el('p', 'muted center', 'Choose one:'));
  const grid = el('div', 'choices');
  for (const o of p.options) {
    const c = optionCard(o);
    c.onclick = () => {
      applyOption(o);
      sfx.purchase();
      completeNode(node);
    };
    grid.append(c);
  }
  body.append(grid);
  const skip = el('button', 'link-btn', 'Skip');
  skip.onclick = () => completeNode(node);
  body.append(skip);
  for (const c of Object.values(party)) if (!c.ko) c.play('cheer', { dur: 1.2 });
  openSheet({ title: node.type === 'elite' ? 'Elite defeated!' : 'Victory!', body, closable: false, tone: 'win' });
}

// ---------------------------------------------------------------- rest, shop, events

function sitAroundFire() {
  // a half ring behind the fire, so everyone faces the fire and the camera
  const ids = partyIds();
  ids.forEach((id, i) => {
    const c = party[id];
    const a = Math.PI * (1.12 + (ids.length > 1 ? i / (ids.length - 1) : 0.5) * 0.76);
    const right = Math.cos(a) * 2.5; // across the screen
    const back = -Math.sin(a) * 1.9; // away from the camera
    if (layout.portrait) c.pos.set(back, FLOOR_Y, 0.6 + right);
    else c.pos.set(right, FLOOR_Y, 0.6 - back);
    c.yaw = Math.atan2(-c.pos.x, 0.6 - c.pos.z);
    c.ko = false;
    c.play('sit', { dur: 4, loop: true });
  });
}

function openRest(node) {
  state = 'rest';
  sitAroundFire();
  const healK = ((save.built.garden || 0) >= 1 ? 0.5 : 0.35) + (save.run.relics.includes('honey') ? 0.15 : 0);
  const body = el('div', 'rest');
  const grid = el('div', 'choices');
  const rest = el('button', 'choice');
  rest.style.setProperty('--cc', '#ff9a3c');
  rest.innerHTML = `<span class="ch-ico">${icon('flame', '#ff9a3c')}</span><b>Rest</b><small>Everyone heals ${Math.round(healK * 100)}% of their health. Knocked-out heroes wake up.</small>`;
  rest.onclick = () => {
    for (const h of save.run.heroes) h.hp = Math.min(h.maxHp, Math.max(h.hp, 0) + Math.round(h.maxHp * healK));
    sfx.healSound(true);
    for (const c of Object.values(party)) bfx.rise(c.pos, '#7dffa8', 12);
    finishRest(node);
  };
  grid.append(rest);
  for (const h of save.run.heroes) {
    const d = HEROES[h.id];
    const t = el('button', 'choice');
    t.style.setProperty('--cc', d.color);
    t.innerHTML = `<img alt="" src="${portrait(h.id, save.gear[h.id] || 0, 72)}"><b>Train ${d.name}</b><small>+15% power, +10% health.</small>`;
    t.onclick = () => {
      applyOption({ type: 'train', id: h.id });
      sfx.purchase();
      finishRest(node);
    };
    grid.append(t);
  }
  body.append(grid);
  openSheet({ title: 'Campfire', note: 'A quiet moment in the dark. Rest, or practise.', body, closable: false });
}

function finishRest(node) {
  for (const c of Object.values(party)) c.action = null;
  placeParty();
  completeNode(node);
}

function shopItems(node) {
  const run = save.run;
  const rng = rngFor(run.seed, 'shop', node.id);
  const owned = new Set(run.cards.map((c) => c.id));
  const items = [];
  for (const id of shuffle(rng, Object.keys(ABILITIES).filter((k) => !owned.has(k))).slice(0, 2)) items.push({ type: 'card', id, price: 48 + Math.floor(rng() * 14) });
  const up = run.cards.filter((c) => c.level < 3);
  if (up.length) items.push({ type: 'upgrade', id: pick(rng, up).id, price: 55 + Math.floor(rng() * 10) });
  const have = new Set(run.relics);
  for (const id of shuffle(rng, Object.keys(RELICS).filter((k) => !have.has(k))).slice(0, 2)) items.push({ type: 'relic', id, price: 80 + Math.floor(rng() * 25) });
  items.push({ type: 'heal', price: 28 });
  return items;
}

function openShop(node) {
  state = 'shop';
  const run = save.run;
  const p = run.pending;
  const body = el('div', 'shop');
  const grid = el('div', 'choices shop-grid');
  for (const it of p.items) {
    let c;
    if (it.type === 'heal') {
      c = el('button', 'choice');
      c.style.setProperty('--cc', '#6fd08c');
      c.innerHTML = `<span class="ch-kind">Tonic</span><span class="ch-ico">${icon('leaf', '#6fd08c')}</span><b>Herbal tonic</b><small>Heal everyone 30%.</small>`;
    } else c = optionCard(it);
    const full = it.type === 'card' && run.cards.length >= MAX_CARDS;
    const maxed = it.type === 'upgrade' && run.cards.find((x) => x.id === it.id)?.level >= 3;
    c.append(el('span', 'price', it.sold ? 'Sold' : `${icon('coin', '#ffcf45')} ${it.price}`));
    c.disabled = it.sold || run.gold < it.price || full || maxed;
    c.onclick = () => {
      if (c.disabled) return;
      run.gold -= it.price;
      it.sold = true;
      if (it.type === 'heal') for (const h of run.heroes) h.hp = Math.min(h.maxHp, Math.max(0, h.hp) + Math.round(h.maxHp * 0.3));
      else applyOption(it);
      persist();
      sfx.coin();
      $('gold').textContent = run.gold;
      openShop(node);
    };
    grid.append(c);
  }
  body.append(grid);
  const leave = el('button', 'btn btn-go', 'Move on');
  leave.onclick = () => completeNode(node);
  body.append(leave);
  openSheet({ title: 'The peddler', note: `You have ${icon('coin', '#ffcf45')} <b>${run.gold}</b> gold.`, body, closable: false });
}

function eventCtx() {
  const run = save.run;
  const rng = rngFor(run.seed, 'evx', run.done.length);
  return {
    rng,
    goldNow: run.gold,
    heal: (f) => run.heroes.forEach((h) => (h.hp = Math.min(h.maxHp, Math.max(0, h.hp) + Math.round(h.maxHp * f)))),
    hurt: (f) => run.heroes.forEach((h) => h.hp > 0 && (h.hp = Math.max(1, h.hp - Math.round(h.maxHp * f)))),
    gold: (n) => (run.gold = Math.max(0, run.gold + n)),
    embers: (n) => addEmbers(n),
    hasRelic: (id) => run.relics.includes(id),
    giveRelic: (id) => (run.relics.push(id), refreshMaxHp()),
    relic: () => {
      const id = newRelic(rng);
      if (!id) return 'nothing new';
      run.relics.push(id);
      refreshMaxHp();
      return RELICS[id].name;
    },
    canUpgrade: () => run.cards.some((c) => c.level < 3),
    upgradeCard: () => {
      const c = pick(rng, run.cards.filter((x) => x.level < 3));
      c.level++;
      return ABILITIES[c.id].name;
    },
    train: () => {
      const h = pick(rng, run.heroes);
      applyOption({ type: 'train', id: h.id });
      return HEROES[h.id].name;
    },
    toughen: (f) => {
      run.heroes.forEach((h) => (h.tough = (h.tough || 0) + f));
      refreshMaxHp();
    },
  };
}

function openEvent(node, ev) {
  state = 'event';
  const body = el('div', 'event');
  body.append(el('p', 'event-text', ev.text));
  const list = el('div', 'event-choices');
  const ctx = eventCtx();
  for (const ch of ev.choices) {
    const b = el('button', 'btn btn-soft event-btn', `<b>${ch.label}</b>${ch.hint ? `<small>${ch.hint}</small>` : ''}`);
    b.disabled = ch.need ? !ch.need(ctx) : false;
    b.onclick = () => {
      const out = ch.do(ctx);
      if (save.run.pending) save.run.pending.outcome = out;
      sfx.purchase();
      persist();
      showEventOutcome(node, ev, out);
    };
    list.append(b);
  }
  body.append(list);
  openSheet({ title: ev.title, body, closable: false });
}

function showEventOutcome(node, ev, out) {
  state = 'event';
  const res = el('div', 'event');
  res.append(el('p', 'event-text', out));
  const go = el('button', 'btn btn-go', 'Continue');
  go.onclick = () => completeNode(node);
  res.append(go);
  $('gold').textContent = save.run.gold;
  openSheet({ title: ev.title, body: res, closable: false });
}

// ---------------------------------------------------------------- end of a delve

function runOver(won, resumed = false, wait = null) {
  const run = save.run;
  state = 'over';
  hideMap();
  if (!resumed) run.over = won ? 'win' : 'lose';
  if (won && !resumed) {
    save.stats.wins++;
    save.stats.bossesBeaten++;
    addEmbers(15);
    const next = Object.keys(BIOMES).find((k) => !save.biomes.includes(k));
    if (next) save.biomes.push(next);
    run.unlocked = next || null;
    for (const c of Object.values(party)) c.play('cheer', { dur: 3 });
  }
  if (!resumed && run.daily) {
    const d = dailyState();
    if (d.date === run.daily) {
      d.best = Math.max(d.best, won ? ROWS + 1 : run.at ? nodeById(run.at).r + 1 : 0);
      if (won && !d.cleared) {
        d.cleared = true;
        d.streak = (d.streak || 0) + 1;
        d.lastClear = d.date;
        addEmbers(25);
        run.dailyBonus = 25;
      }
    }
  }
  persist();
  const body = el('div', 'over');
  const floor = run.at ? nodeById(run.at).r + 1 : 0;
  body.innerHTML = `
    <div class="over-stats">
      <div><b>${won ? ROWS + 1 : floor}</b><small>floors</small></div>
      <div><b>${run.fights}</b><small>battles won</small></div>
      <div><b>${icon('ember')} ${run.embers}</b><small>embers earned</small></div>
    </div>
    <p class="muted center">${won ? `${BIOMES[run.biome].name} is quiet again.${run.unlocked ? ` A new place opens up below: <b>${BIOMES[run.unlocked].name}</b>.` : ''}` : 'The party slips back up the shaft, a bit dented. The embers they found come home with them.'}</p>`;
  if (run.ups?.length) body.append(el('p', 'level-ups center', `Level ups: ${run.ups.map((u) => `<b>${HEROES[u.id].name} ${u.level}</b>`).join(', ')}`));
  if (run.daily) body.append(el('p', 'muted center', `Daily delve: ${run.dailyBonus ? `cleared! ${icon('ember')} +${run.dailyBonus}` : `best today is floor ${save.daily.best}.`}`));
  if (won && run.chest?.length) body.append(lootBlock(run.chest));
  const back = el('button', 'btn btn-go', 'Back to camp');
  back.onclick = () => ascend();
  body.append(back);
  (wait || after(won ? 1400 : 900)).then(() => {
    state = 'over';
    openSheet({ title: won ? 'The boss is beaten!' : 'Retreat!', body, closable: false, tone: won ? 'win' : 'lose' });
  });
}

function ascend() {
  closeSheet();
  fade(true);
  setTimeout(() => {
    arena.clear();
    clearChest();
    for (const c of Object.values(party)) c.dispose();
    party = {};
    save.run = null;
    persist();
    $('gold-pill').hidden = true;
    state = 'camp';
    setMood('camp');
    dungeonCamera(false);
    rig.snap({ target: CAMP.target.clone().add(new THREE.Vector3(0, -10, 0)), dist: 30 });
    rig.fly(CAMP, 1.8, () => base.cheer());
    fade(false);
    $('camp-panel').hidden = false;
    $('book-btn').hidden = false;
    renderCampPanel();
    makeTags();
    campHeroes(); // levels and trinkets may have changed
  }, 500);
}

// ---------------------------------------------------------------- input

let downAt = null;
$('scene').addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY };
});
$('scene').addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
  downAt = null;
  if (state !== 'camp' || rig.flying) return;
  // heroes first (screen distance), then buildings (raycast)
  const p = { x: 0, y: 0 };
  const rect = $('scene').getBoundingClientRect();
  for (const h of base.heroes) {
    project(new THREE.Vector3(h.char.pos.x, 1, h.char.pos.z), p);
    if (Math.hypot(p.x - (e.clientX - rect.left), p.y - (e.clientY - rect.top)) < 26) {
      h.char.play('wave', { dur: 1 });
      return openHero(h.id);
    }
  }
  const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, view.camera);
  const id = base.pick(ray);
  if (id) openBuilding(id);
});

window.addEventListener(
  'pointerdown',
  () => {
    unlockAudio().then(() => {
      setMusic(save.music);
      setMood(save.run ? 'delve' : 'camp');
    });
  },
  { once: true },
);

// ---------------------------------------------------------------- main loop

const clock = new THREE.Clock();
let ambT = 0;
const shakeOff = new THREE.Vector3();

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  rig.update(dt);
  const inCamp = state === 'camp' || (state === 'descend' && !save.run?.started);
  if (state === 'camp') {
    sky.update(dt, CAMP.target, view.camera);
    base.update(dt, 1 - sky.day);
    ambT -= dt;
    if (ambT <= 0) {
      ambT = 1;
      setAmbience({ rain: Math.max(sky.p.rain, sky.p.snow * 0.3), wind: 0.15 + sky.p.cloud * 0.25, day: sky.day, clear: 1 - sky.p.cloud });
    }
  } else {
    base.update(dt * 0.25, 0.5);
    arena.update(dt);
  }
  void inCamp;
  view.clouds.update(dt);
  if (battle) {
    battle.update(dt);
    updateBattlePanel();
  } else {
    stepWalking(dt);
    for (const c of Object.values(party)) c.update(dt);
    bfx.update(dt);
  }
  if (chestChar) {
    chestChar.update(dt);
    if (chestLight.intensity > 2.5) chestLight.intensity = Math.max(2.5, chestLight.intensity - dt * 4);
  }
  tickMaterials(dt);
  tickTimers(dt);
  updateTags();
  // camera shake from big hits
  if (bfx.shake > 0) {
    const s = bfx.shake * 0.35;
    shakeOff.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    view.camera.position.add(shakeOff);
  }
  view.renderer.render(view.scene, view.camera);
  if (bfx.shake > 0) view.camera.position.sub(shakeOff);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- start

setupCamp();
setEmbers(save.embers);
rig.snap(CAMP);
if (save.run) {
  $('camp-panel').hidden = true;
  $('book-btn').hidden = true;
  descend(true);
}
frame();

if (!import.meta.env.DEV && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

// debug handle
window.vd = {
  save,
  get state() {
    return state;
  },
  get battle() {
    return battle;
  },
  arena,
  view,
  rig,
  base,
  party: () => party,
  addEmbers: (n) => {
    addEmbers(n);
    persist();
  },
  win: () => battle && battle.enemies().forEach((u) => battle.damage(null, u, 99999)),
  lose: () => battle && battle.heroes().forEach((u) => battle.damage(null, u, 99999)),
  look: (station) => rig.snap(station),
  arenaStation,
  reset: () => (wipe(), location.reload()),
  loot: (kind = 'boss', n = 1) => {
    for (let i = 0; i < n; i++) stashLoot(chestLoot(Math.random, kind, 1));
    persist();
    return save.items.length;
  },
  chest: (kind = 'elite') => playChest(kind, chestLoot(Math.random, kind, 1)),
  go: (type) => travelTo(save.run.map.nodes.find((n) => n.type === type)), // jump to the first node of a type
  unlockAll: () => ((save.biomes = Object.keys(BIOMES)), persist()),
  xp: (n = 100) => {
    for (const id of save.roster) save.xp[id] = (save.xp[id] || 0) + n;
    persist();
  },
  levelInfo,
};
