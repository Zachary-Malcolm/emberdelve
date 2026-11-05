import { BIOMES, ENEMIES, biomeEnemies } from './enemies.js';
import { BIOME_LIST } from './biomes/index.js';
import { RARITIES, EFFECTS, MYTHICS } from './items.js';
import { portrait } from './portraits.js';
import { icon } from './icons.js';

/*
 * The Journal: a collection book of every creature met (portrait + how many were beaten, unknown
 * ones as dark silhouettes), every kind of trinket found, and the player's records.
 * save.seen = { met: {id: true}, beaten: {id: n}, items: {rarity: n, 'fx:effect': true} }.
 * Built to grow: creatures are grouped per biome straight from the biome registry.
 */

export const TRAITS = {
  thorns: 'Spiky: hitting it up close stings back.',
  poison: 'Its hits poison.',
  lifesteal: 'Heals itself as it bites.',
  burst: 'Bursts when it breaks.',
  mend: 'Patches up its friends.',
  shieldSelf: 'Shields itself now and then.',
  stunHit: 'Every third hit stuns.',
  summon: 'Calls for help as it weakens.',
  burn: 'Its hits set heroes alight.',
  enrage: 'Gets angry below half health: faster and stronger.',
};

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

export function journalBody(save, tab = 'creatures', onTab = () => {}) {
  const wrap = el('div', 'journal');
  const tabs = el('div', 'tabs');
  for (const [k, label] of [['creatures', 'Creatures'], ['trinkets', 'Trinkets'], ['records', 'Records']]) {
    const b = el('button', `mini-chip ${k === tab ? 'on' : ''}`, label);
    b.onclick = () => onTab(k);
    tabs.append(b);
  }
  wrap.append(tabs);
  if (tab === 'creatures') wrap.append(creatures(save));
  else if (tab === 'trinkets') wrap.append(trinkets(save));
  else wrap.append(records(save));
  return wrap;
}

export function journalNote(save) {
  const all = Object.keys(ENEMIES);
  const met = all.filter((id) => save.seen.met[id]).length;
  return `${met} of ${all.length} creatures met.`;
}

function creatures(save) {
  const box = el('div', 'jr-biomes');
  BIOME_LIST.forEach((m, i) => {
    const key = m.biome.key;
    const open = save.biomes.includes(key);
    const ids = biomeEnemies(key);
    const met = ids.filter((id) => save.seen.met[id]).length;
    const sec = el('section', 'jr-biome');
    sec.style.setProperty('--bc', BIOMES[key].accent);
    sec.append(el('h3', '', `${open || met ? BIOMES[key].name : '???'} <small>${met}/${ids.length}</small>`));
    if (!open && !met && i > 0) {
      sec.append(el('p', 'muted', 'Not found yet. Beat the boss of the previous place to open the way.'));
      box.append(sec);
      return;
    }
    const grid = el('div', 'jr-grid');
    for (const id of ids) {
      const e = ENEMIES[id];
      const seen = !!save.seen.met[id];
      const n = save.seen.beaten[id] || 0;
      const card = el('button', `jr-card ${seen ? '' : 'unknown'} ${e.boss ? 'boss' : e.elite ? 'elite' : ''}`);
      card.innerHTML = `<img alt="" src="${portrait(id, 0, 96, true)}"><b>${seen ? e.name : '???'}</b><small>${seen ? (n ? `Beaten ${n}` : 'Met') : e.boss ? 'Boss' : e.elite ? 'Elite' : '&nbsp;'}</small>`;
      card.onclick = () => {
        const d = grid.querySelector('.jr-detail');
        d.innerHTML = seen
          ? `<b>${e.name}</b>${e.boss ? ' <span class="jtag boss">Boss</span>' : e.elite ? ' <span class="jtag elite">Elite</span>' : ''}<small>${e.melee ? 'Fights up close' : 'Attacks from range'}${e.trait ? ` · ${TRAITS[e.trait] || ''}` : ''} · beaten ${n} time${n === 1 ? '' : 's'}</small>`
          : `<b>???</b><small>Not met yet. Keep delving into ${BIOMES[key].name}.</small>`;
      };
      grid.append(card);
    }
    grid.append(el('div', 'jr-detail muted', 'Tap a creature.'));
    sec.append(grid);
    box.append(sec);
  });
  return box;
}

function trinkets(save) {
  const box = el('div', 'jr-items');
  const rows = el('div', 'jr-rarities');
  for (const r of RARITIES) {
    const n = save.seen.items[r.id] || 0;
    rows.append(el('div', `jr-rarity r-${r.id} ${n ? '' : 'none'}`, `<span class="rarity-tag r-${r.id}">${r.name}</span><b>${n}</b><small>found</small>`));
  }
  box.append(rows);
  box.append(el('h3', '', 'Legendary effects'));
  const fx = el('div', 'jr-list');
  for (const [k, e] of Object.entries(EFFECTS)) {
    const got = save.seen.items['fx:' + k];
    fx.append(el('div', `jr-row ${got ? '' : 'unknown'}`, `${icon('star', got ? '#f0a03a' : '#5a5560')}<div><b>${got ? `…${e.title}` : '???'}</b><small>${got ? e.text : 'Not found yet.'}</small></div>`));
  }
  box.append(fx);
  box.append(el('h3', '', 'Mythics'));
  const my = el('div', 'jr-list');
  for (const [k, m] of Object.entries(MYTHICS)) {
    const got = save.seen.items['fx:' + k];
    my.append(el('div', `jr-row ${got ? '' : 'unknown'}`, `${icon(m.icon, got ? '#f0567f' : '#5a5560')}<div><b>${got ? m.name : '???'}</b><small>${got ? m.text : 'A unique treasure. Bosses are the best bet.'}</small></div>`));
  }
  box.append(my);
  return box;
}

function records(save) {
  const st = save.stats;
  const d = save.daily;
  const box = el('div', 'jr-records');
  const row = (ico, label, val) => box.append(el('div', 'jr-row', `${ico}<div><b>${val}</b><small>${label}</small></div>`));
  row(icon('sword', '#e8eef5'), 'Delves started', st.runs);
  row(icon('crown', '#ffcf45'), 'Bosses beaten', st.bossesBeaten);
  row(icon('ember'), 'Embers earned in total', st.embersEarned);
  row(icon('compass', '#d9a441'), 'Places opened', `${save.biomes.length} of ${BIOME_LIST.length}`);
  row(icon('calendar', '#7fc8ff'), 'Daily delve today', d.date ? (d.cleared ? 'Cleared!' : `Best floor ${d.best}, ${d.tries} ${d.tries === 1 ? 'try' : 'tries'}`) : 'Not tried yet');
  row(icon('trophy', '#ffcf45'), 'Daily clears in a row', d.streak || 0);
  return box;
}
