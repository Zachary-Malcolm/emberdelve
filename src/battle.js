import * as THREE from 'three';
import { Character } from './chars.js';
import { HEROES } from './heroes.js';
import { enemySpec, ENEMIES } from './enemies.js';
import { ABILITIES, enemyStats } from './data.js';
import * as sfx from './audio.js';

/*
 * Idle auto-battle. Heroes stand on the left, enemies on the right; everyone acts on their own
 * timer. Melee units hop over, swing and hop back; ranged units fire projectiles. The player's
 * only input is the ability cards, paid for with sparks that trickle in over the fight.
 * Positions are local to the arena group (floor top at y = 0.5).
 */

export const FLOOR_Y = 0.5;
const HERO_FACE = Math.PI / 2 - 0.45;
const ENEMY_FACE = -Math.PI / 2 + 0.45;
export const MAX_SPARKS = 10;
const _v = new THREE.Vector3();

/** Horizontal squeeze of both lines (main.js sets it below 1 on tall phone screens). */
export const layout = { x: 1 };

/** Spread n units along z. */
function spreadZ(n, gap) {
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * gap);
}

/** Home positions for the party: front-role heroes at x = -2.4, the rest at x = -4.8. */
export function heroFormation(ids) {
  const front = ids.filter((id) => HEROES[id].role === 'front');
  const back = ids.filter((id) => HEROES[id].role !== 'front');
  const out = {};
  spreadZ(front.length, 2.2).forEach((z, i) => (out[front[i]] = new THREE.Vector3(-2.5 * layout.x, FLOOR_Y, z + 0.3)));
  spreadZ(back.length, 2.5).forEach((z, i) => (out[back[i]] = new THREE.Vector3((-4.7 - (i % 2) * 1.1) * layout.x, FLOOR_Y, z + 0.2)));
  return out;
}

function enemyFormation(ids) {
  const out = [];
  const big = ids.filter((id) => ENEMIES[id].boss || ENEMIES[id].elite);
  const small = ids.filter((id) => !(ENEMIES[id].boss || ENEMIES[id].elite));
  big.forEach((id) => out.push([id, new THREE.Vector3((ENEMIES[id].boss ? 5.2 : 4.6) * layout.x, FLOOR_Y, 0)]));
  const melee = small.filter((id) => ENEMIES[id].melee);
  const ranged = small.filter((id) => !ENEMIES[id].melee);
  const mx = big.length ? 2.4 : 2.6;
  spreadZ(melee.length, big.length ? 3.6 : 2.0).forEach((z, i) => out.push([melee[i], new THREE.Vector3((mx + (i % 2) * 0.5) * layout.x, FLOOR_Y, z)]));
  spreadZ(ranged.length, 2.4).forEach((z, i) => out.push([ranged[i], new THREE.Vector3((big.length ? 7 : 5.2) * layout.x, FLOOR_Y, z + 0.4)]));
  return out;
}

export class Battle {
  /**
   * heroes: [{ id, hp, maxHp, atk, spd, char }]   (char = the hero's Character, already in the arena)
   * enemyIds, level; cards: [{ id, level }]; mods: run modifiers (relics, buildings)
   * ui: { overlay (element), bossBar (element) }  onEnd(result)  onChange()
   */
  constructor({ charBatch, fx, heroes, enemyIds, level, cards, mods, ui, onEnd, onChange, kind }) {
    this.batch = charBatch;
    this.fx = fx;
    this.mods = mods;
    this.ui = ui;
    this.onEnd = onEnd;
    this.onChange = onChange || (() => {});
    this.kind = kind;
    this.cards = cards.map((c) => ({ ...c, cd: 0 }));
    this.sparks = Math.min(MAX_SPARKS, 2 + (mods.startSparks || 0));
    this.speed = 1;
    this.auto = false;
    this.time = 0;
    this.over = null;
    this.endT = 0;
    this.hitStop = 0;
    this.freeUsed = !mods.freeFirst;
    this.buffs = { atk: 0, atkT: 0, haste: 0, hasteT: 0 };
    this.units = [];
    this.level = level;

    const homes = heroFormation(heroes.map((h) => h.id));
    for (const h of heroes) {
      const def = HEROES[h.id];
      const u = this.addUnit({
        side: 'hero',
        id: h.id,
        name: def.name,
        hero: h,
        char: h.char,
        hp: h.hp,
        maxHp: h.maxHp,
        atk: h.atk,
        spd: h.spd,
        melee: def.role === 'front',
        home: homes[h.id],
      });
      u.alive = h.hp > 0;
      u.char.ko = !u.alive;
      u.char.yaw = HERO_FACE;
    }
    for (const [id, pos] of enemyFormation(enemyIds)) this.spawnEnemy(id, pos, 0.25 + this.units.length * 0.12);
    for (const u of this.units) u.timer = 0.6 + Math.random() * u.spd * 0.8 + (u.side === 'enemy' ? 0.9 : 0);
    if (mods.enemyBurn) for (const u of this.enemies()) u.burn = { dps: 4 + level, t: 6 };
    this.boss = this.units.find((u) => u.side === 'enemy' && (u.def.boss || u.def.elite)) || null;
  }

  addUnit(o) {
    const u = { alive: true, shield: 0, stun: 0, actions: 0, busy: false, timer: 1, move: null, poison: null, burn: null, ...o };
    u.bar = document.createElement('div');
    u.bar.className = `hpbar ${u.side}`;
    u.bar.innerHTML = '<i class="hp-shield"></i><i class="hp-fill"></i>';
    this.ui.overlay.append(u.bar);
    this.units.push(u);
    return u;
  }

  spawnEnemy(id, pos, delay = 0) {
    const def = ENEMIES[id];
    const st = enemyStats(id, this.level);
    const char = new Character(this.batch, enemySpec(id), { scale: def.scale });
    char.pos.copy(pos);
    char.yaw = ENEMY_FACE;
    char.spawn(delay);
    const u = this.addUnit({ side: 'enemy', id, name: def.name, def, char, hp: st.hp, maxHp: st.hp, atk: st.atk, spd: def.spd, melee: def.melee, home: pos.clone() });
    u.timer = 1 + delay + Math.random();
    return u;
  }

  heroes() {
    return this.units.filter((u) => u.side === 'hero' && u.alive);
  }
  enemies() {
    return this.units.filter((u) => u.side === 'enemy' && u.alive);
  }

  // ------------------------------------------------------------ helpers

  chest(u, k = 0.55) {
    return new THREE.Vector3(u.char.pos.x, u.char.pos.y + u.char.height * k, u.char.pos.z);
  }

  face(u, target) {
    u.char.yaw = Math.atan2(target.char.pos.x - u.char.pos.x, target.char.pos.z - u.char.pos.z);
  }

  faceHome(u) {
    u.char.yaw = u.side === 'hero' ? HERO_FACE : ENEMY_FACE;
  }

  moveTo(u, to, then, speed = 7.5) {
    const from = u.char.pos.clone();
    const dist = from.distanceTo(to);
    u.move = { from, to: to.clone(), t: 0, dur: Math.max(0.12, dist / speed), then };
    if (dist > 0.05) u.char.yaw = Math.atan2(to.x - from.x, to.z - from.z);
  }

  /** Walk over, swing, walk back. onHit(target) runs at the moment of impact. */
  melee(u, target, anim, onHit, { dur = 0.6, hitAt = 0.5 } = {}) {
    u.busy = true;
    const reach = 0.55 + (target.char.width || 0.6) * 0.45 + (u.char.width || 0.6) * 0.4;
    const dir = _v.copy(u.char.pos).sub(target.char.pos).setY(0).normalize();
    const spot = target.char.pos.clone().addScaledVector(dir, reach).setY(FLOOR_Y);
    this.moveTo(u, spot, () => {
      if (!u.alive) return;
      this.face(u, target);
      u.char.play(anim, {
        dur,
        hitAt,
        onHit: () => {
          if (u.alive && target.alive) onHit(target);
          else if (u.alive) sfx.swing();
        },
        onEnd: () => this.goHome(u),
      });
      sfx.swing();
    });
  }

  goHome(u) {
    if (!u.alive) return;
    this.moveTo(u, u.home, () => {
      u.busy = false;
      this.faceHome(u);
    }, 6);
  }

  /** Stand still, play an animation, and at the release moment call onRelease. */
  ranged(u, target, anim, onRelease, { dur = 0.75, hitAt = 0.55 } = {}) {
    u.busy = true;
    this.face(u, target);
    u.char.play(anim, {
      dur,
      hitAt,
      onHit: () => u.alive && onRelease(),
      onEnd: () => {
        u.busy = false;
        if (u.alive) this.faceHome(u);
      },
    });
  }

  heroAtk(u) {
    return u.atk * (1 + this.buffs.atk) * (this.mods.atkMul || 1);
  }

  avgHeroAtk() {
    const hs = this.units.filter((u) => u.side === 'hero');
    return hs.reduce((a, u) => a + u.atk, 0) / Math.max(1, hs.length);
  }

  crit(u) {
    const base = 0.08 + (this.mods.critBonus || 0) + (u.id === 'duskblade' ? 0.22 : 0);
    return Math.random() < base;
  }

  frontEnemy(from) {
    let best = null;
    let bd = 1e9;
    for (const e of this.enemies()) {
      const d = e.char.pos.distanceTo(from.char.pos) + (e.def.boss ? 0.5 : 0);
      if (d < bd) (bd = d), (best = e);
    }
    return best;
  }

  // ------------------------------------------------------------ damage + healing

  damage(src, target, amount, { crit = false, melee = false, quiet = false, color = null } = {}) {
    if (!target?.alive) return 0;
    if (src?.side === 'hero' && (target.def?.boss || target.def?.elite)) amount *= this.mods.bossMul || 1;
    if (crit) amount *= 1.7;
    let amt = Math.max(1, Math.round(amount * (0.92 + Math.random() * 0.16)));
    const pos = this.chest(target, 0.75);
    if (target.shield > 0) {
      const soak = Math.min(target.shield, amt);
      target.shield -= soak;
      amt -= soak;
      if (target.shield <= 0) this.fx.setBubble(target, false);
      if (!amt) {
        this.fx.text(pos, `${soak}`, 'shield');
        sfx.block();
        return 0;
      }
    }
    target.hp -= amt;
    this.fx.text(pos, crit ? `${amt}!` : `${amt}`, crit ? 'crit' : target.side === 'hero' ? 'hurt' : 'dmg');
    target.char.hurt(Math.min(1.5, amt / Math.max(10, target.maxHp * 0.12)));
    this.fx.burst(this.chest(target), color || (crit ? '#ffd34d' : '#ffffff'), crit ? 12 : 6, { speed: crit ? 4 : 2.6, up: 2, life: 0.4, size: crit ? 0.2 : 0.15 });
    if (!quiet) sfx.hit(crit, target.side === 'hero');
    if (crit) {
      this.hitStop = 0.075;
      this.fx.shake = Math.max(this.fx.shake, 0.12);
    }
    // traits + relics
    if (melee && src?.alive) {
      if (target.def?.trait === 'thorns' && src.side === 'hero') this.damage(target, src, amt * 0.15, { quiet: true, color: '#e8e0cc' });
      if (target.side === 'hero' && this.mods.thorns && src.side === 'enemy') this.damage(target, src, amt * this.mods.thorns, { quiet: true, color: '#9fe3ff' });
    }
    if (src?.def?.trait === 'lifesteal' && src.alive) this.heal(src, amt * 0.5, true);
    if (target.def?.trait === 'summon') this.checkSummon(target);
    if (target.hp <= 0) this.kill(target, src);
    this.onChange();
    return amt;
  }

  heal(u, amount, quiet = false) {
    if (!u.alive) return 0;
    const amt = Math.round(Math.min(u.maxHp - u.hp, amount * (u.side === 'hero' ? this.mods.healMul || 1 : 1)));
    if (amt <= 0) return 0;
    u.hp += amt;
    this.fx.text(this.chest(u, 0.8), `+${amt}`, 'heal');
    if (!quiet) this.fx.rise(_v.copy(u.char.pos).setY(u.char.pos.y + 0.2), '#7dffa8', 8);
    this.onChange();
    return amt;
  }

  shield(u, amount) {
    if (!u.alive) return;
    u.shield = Math.round(Math.max(u.shield, 0) + amount);
    this.fx.setBubble(u, true);
    this.fx.text(this.chest(u, 0.9), `+${Math.round(amount)}`, 'shield');
  }

  stun(u, secs) {
    if (!u.alive) return;
    u.stun = Math.max(u.stun, secs);
  }

  kill(u, src) {
    u.alive = false;
    u.hp = 0;
    u.move = null;
    u.shield = 0;
    this.fx.setBubble(u, false);
    this.fx.setIce(u, false);
    u.bar.classList.add('gone');
    u.char.tint = null;
    if (u.side === 'enemy') {
      u.char.action = null;
      u.char.shatter(u.def.boss ? 1.6 : 1);
      this.fx.burst(this.chest(u, 0.4), '#ffffff', u.def.boss ? 30 : 12, { speed: 4, up: 3, life: 0.6, size: 0.22, mat: 'plaster' });
      sfx.shatter(u.def.boss);
      if (u.def.boss) this.fx.shake = 0.6;
      if (u.def.trait === 'burst') {
        const h = this.heroes().sort((a, b) => a.char.pos.distanceTo(u.char.pos) - b.char.pos.distanceTo(u.char.pos))[0];
        this.fx.ring(u.char.pos, '#7fd6e8', 2.4);
        if (h) this.damage(u, h, u.atk * 1.3, { color: '#7fd6e8' });
      }
    } else {
      u.char.action = null;
      u.char.moving = false;
      u.char.ko = true;
      u.char.koT = 0;
      u.char.pos.copy(u.home);
      this.faceHome(u);
      sfx.ko();
    }
    void src;
  }

  checkSummon(boss) {
    boss.summoned ||= 0;
    const thresholds = [0.66, 0.33];
    while (boss.summoned < thresholds.length && boss.hp / boss.maxHp < thresholds[boss.summoned] && boss.hp > 0) {
      boss.summoned++;
      sfx.summon();
      for (const z of [-2.2, 2.2]) {
        const n = this.spawnEnemy(boss.def.summon, new THREE.Vector3(2.4, FLOOR_Y, z), 0.1);
        n.timer = 1.5;
      }
    }
  }

  // ------------------------------------------------------------ hero actions

  heroAct(u) {
    const def = HEROES[u.id];
    const n = ++u.actions;
    const skill = n % def.skillEvery === 0;
    const atk = this.heroAtk(u);
    const target = this.frontEnemy(u);
    if (!target) return;
    switch (u.id) {
      case 'bulwark':
        if (skill)
          this.melee(u, target, 'bash', (t) => {
            this.damage(u, t, atk * 1.3, { melee: true });
            this.stun(t, 1.4);
            this.shield(u, u.maxHp * 0.1);
            this.fx.ring(t.char.pos, '#ffe08a', 1.6, 12);
            sfx.bash();
          }, { dur: 0.6, hitAt: 0.45 });
        else this.melee(u, target, 'slash', (t) => this.damage(u, t, atk, { crit: this.crit(u), melee: true }), { dur: 0.62, hitAt: 0.5 });
        break;
      case 'duskblade': {
        const t2 = skill ? this.enemies().sort((a, b) => a.hp - b.hp)[0] : target;
        this.melee(u, t2, 'stab', (t) => {
          this.damage(u, t, atk * (skill ? 2 : 1), { crit: skill || this.crit(u), melee: true });
          if (skill) this.fx.burst(this.chest(t), '#6fe0c0', 14, { speed: 4 });
        }, { dur: 0.5, hitAt: 0.5 });
        break;
      }
      case 'ranger': {
        const t = this.enemies().sort((a, b) => a.hp - b.hp)[0];
        this.ranged(u, t, 'shoot', () => {
          const from = this.chest(u, 0.62).add(new THREE.Vector3(0.4, 0, 0));
          const fire = (tt, delay = 0) =>
            setTimeout(() => {
              if (!tt.alive) return;
              sfx.arrow();
              const to = this.chest(tt);
              this.fx.shoot('arrow', from, to, { dur: from.distanceTo(to) / 22, arc: 0.4, onHit: () => this.damage(u, tt, atk, { crit: this.crit(u) }) });
            }, delay / this.speed);
          fire(t);
          if (skill) {
            const others = this.enemies().filter((e) => e !== t);
            fire(others.length ? others[Math.floor(Math.random() * others.length)] : t, 120);
          }
        }, { dur: 0.75, hitAt: 0.62 });
        break;
      }
      case 'sage': {
        const all = this.enemies();
        const t = all[Math.floor(Math.random() * all.length)];
        this.ranged(u, t, 'cast', () => {
          const from = this.chest(u, 1.1).add(new THREE.Vector3(0.3, 0, 0.2));
          sfx.cast();
          this.fx.shoot(skill ? 'bigorb' : 'orb', from, this.chest(t), {
            dur: 0.5,
            arc: 1,
            color: '#ffb347',
            trail: '#ffcf6a',
            onHit: () => {
              if (skill) {
                sfx.boom();
                this.fx.shake = Math.max(this.fx.shake, 0.25);
                for (const e of this.enemies()) {
                  this.damage(u, e, atk * (e === t ? 1.2 : 0.6), { color: '#ffb347', quiet: e !== t });
                  this.fx.burst(this.chest(e), '#ff9a3c', 10, { speed: 3.5 });
                }
                this.fx.ring(t.char.pos, '#ffb347', 3.4, 22);
              } else this.damage(u, t, atk, { crit: this.crit(u), color: '#ffcf6a' });
            },
          });
        }, { dur: 0.85, hitAt: 0.55 });
        break;
      }
      case 'keeper': {
        const allies = this.heroes();
        const hurt = allies.filter((a) => a.hp / a.maxHp < 0.82).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        if (skill && allies.some((a) => a.hp < a.maxHp)) {
          this.ranged(u, u, 'heal', () => {
            sfx.healSound(true);
            for (const a of allies) this.heal(a, atk * 1.4);
            this.fx.ring(u.char.pos, '#ffe7a8', 4.5, 24);
          }, { dur: 0.9, hitAt: 0.5 });
        } else if (hurt.length) {
          const t = hurt[0];
          this.ranged(u, t, 'heal', () => {
            sfx.healSound();
            const from = this.chest(u, 1.0);
            this.fx.shoot('mote', from, this.chest(t), { dur: 0.35, arc: 1.2, color: '#ffe7a8', trail: '#fff3c4', onHit: () => this.heal(t, atk * 2.6) });
          }, { dur: 0.8, hitAt: 0.5 });
        } else {
          const t = target;
          this.ranged(u, t, 'heal', () => {
            const from = this.chest(u, 1.0);
            this.fx.shoot('mote', from, this.chest(t), { dur: 0.45, arc: 1.2, color: '#ffe7a8', trail: '#fff3c4', onHit: () => this.damage(u, t, atk * 0.9, { color: '#ffe7a8' }) });
          }, { dur: 0.8, hitAt: 0.5 });
        }
        break;
      }
      case 'tinker': {
        const t = target;
        this.ranged(u, t, 'throw', () => {
          const from = this.chest(u, 0.8);
          sfx.swing();
          this.fx.shoot(skill ? 'bigbomb' : 'bomb', from, t.char.pos.clone().setY(FLOOR_Y + 0.3), {
            dur: 0.6,
            arc: 2.4,
            spin: 9,
            onHit: () => {
              sfx.boom();
              this.fx.ring(t.char.pos, '#ff9a3c', skill ? 3 : 2.2, 16);
              this.fx.burst(t.char.pos.clone().setY(FLOOR_Y + 0.4), '#ffb347', 14, { speed: 4, up: 3 });
              this.fx.shake = Math.max(this.fx.shake, skill ? 0.3 : 0.12);
              for (const e of this.enemies()) {
                const d = e.char.pos.distanceTo(t.char.pos);
                if (e === t) this.damage(u, e, atk * (skill ? 1.8 : 1), { crit: this.crit(u), color: '#ff9a3c' });
                else if (d < 2.6) this.damage(u, e, atk * 0.45, { quiet: true, color: '#ff9a3c' });
                if (skill && e.alive && d < 2.6) e.burn = { dps: atk * 0.35, t: 4 };
              }
            },
          });
        }, { dur: 0.7, hitAt: 0.5 });
        break;
      }
    }
  }

  // ------------------------------------------------------------ enemy actions

  enemyTarget(u) {
    const hs = this.heroes();
    if (!hs.length) return null;
    if (u.melee) {
      const tank = hs.find((h) => h.id === 'bulwark');
      if (tank && Math.random() < 0.72) return tank;
      const front = hs.filter((h) => HEROES[h.id].role === 'front');
      if (front.length && Math.random() < 0.6) return front[Math.floor(Math.random() * front.length)];
    }
    return hs[Math.floor(Math.random() * hs.length)];
  }

  enemyAct(u) {
    const def = u.def;
    const n = ++u.actions;
    const t = this.enemyTarget(u);
    if (!t) return;
    const atk = u.atk;

    if (def.trait === 'mend' && n % 3 === 0) {
      const hurt = this.enemies().filter((e) => e.hp < e.maxHp * 0.85).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (hurt) {
        u.busy = true;
        u.char.play('cast', { dur: 0.7, hitAt: 0.5, onHit: () => this.heal(hurt, hurt.maxHp * 0.18), onEnd: () => (u.busy = false) });
        return;
      }
    }
    if (def.trait === 'shieldSelf' && n % 4 === 0) {
      u.busy = true;
      u.char.play('cast', { dur: 0.9, hitAt: 0.5, onHit: () => (this.shield(u, u.maxHp * 0.1), sfx.block()), onEnd: () => (u.busy = false) });
      return;
    }
    // big area slams: Rootheart every 3rd swing, Prism Sentinel every 3rd action
    if ((u.id === 'rootheart' || u.id === 'sentinel') && n % 3 === 0) {
      u.busy = true;
      u.char.play('slam', {
        dur: 1.1,
        hitAt: 0.58,
        onHit: () => {
          sfx.slam();
          this.fx.shake = 0.5;
          const c = new THREE.Vector3(-3.6, FLOOR_Y, 0);
          this.fx.ring(c, u.id === 'sentinel' ? '#9fe3ff' : '#c9a46a', 4.5, 26);
          for (const h of this.heroes()) this.damage(u, h, atk * 0.6, { quiet: true, color: '#c9a46a' });
        },
        onEnd: () => (u.busy = false),
      });
      return;
    }

    if (u.melee) {
      const anim = def.attack === 'hop' ? 'hop' : def.attack;
      this.melee(u, t, anim, (tt) => {
        this.damage(u, tt, atk, { melee: true });
        if (def.trait === 'poison') tt.poison = { dps: atk * 0.3, t: 4 };
        if (def.trait === 'stunHit' && n % 3 === 0) {
          this.stun(tt, 1.2);
          this.fx.ring(tt.char.pos, '#e07fff', 1.6, 12);
        }
        if (def.attack === 'slam') {
          sfx.slam();
          this.fx.shake = Math.max(this.fx.shake, 0.25);
        }
      }, { dur: def.attack === 'slam' ? 1.0 : def.attack === 'hop' ? 0.65 : 0.6, hitAt: def.attack === 'slam' ? 0.58 : 0.5 });
    } else {
      this.ranged(u, t, u.id === 'sentinel' ? 'cast' : def.attack, () => {
        const from = this.chest(u, 0.8);
        sfx.cast();
        this.fx.shoot(u.id === 'sentinel' ? 'shard' : 'spore', from, this.chest(t), {
          dur: from.distanceTo(this.chest(t)) / 12,
          arc: 1.2,
          color: def.bolt,
          trail: def.bolt,
          onHit: () => {
            this.damage(u, t, atk, { color: def.bolt });
            if (def.trait === 'poison') t.poison = { dps: atk * 0.3, t: 4 };
          },
        });
      }, { dur: 0.8, hitAt: 0.55 });
    }
  }

  // ------------------------------------------------------------ abilities

  cardCost(card) {
    return this.freeUsed ? ABILITIES[card.id].cost : 0;
  }

  canCast(i) {
    const c = this.cards[i];
    if (!c || this.over || c.cd > 0) return false;
    if (this.sparks < this.cardCost(c)) return false;
    const def = ABILITIES[c.id];
    if (def.kind === 'revive') return this.units.some((u) => u.side === 'hero' && !u.alive);
    if (def.kind === 'healAll') return this.heroes().some((u) => u.hp < u.maxHp);
    return this.enemies().length > 0;
  }

  cast(i) {
    if (!this.canCast(i)) return false;
    const card = this.cards[i];
    const def = ABILITIES[card.id];
    this.sparks -= this.cardCost(card);
    this.freeUsed = true;
    card.cd = 1.2;
    const p = def.power[Math.min(2, card.level - 1)] * (this.mods.abilityMul || 1);
    const avg = this.avgHeroAtk() * (1 + this.buffs.atk) * (this.mods.atkMul || 1);
    const heroes = this.heroes();
    const enemies = this.enemies();
    sfx.card(def.kind);
    switch (def.kind) {
      case 'healAll':
        for (const h of heroes) this.heal(h, h.maxHp * p);
        break;
      case 'buffAtk':
        this.buffs.atk = p;
        this.buffs.atkT = def.dur;
        for (const h of heroes) this.fx.rise(h.char.pos, '#ff9a3c', 10);
        break;
      case 'haste':
        this.buffs.haste = p;
        this.buffs.hasteT = def.dur;
        for (const h of heroes) this.fx.rise(h.char.pos, '#a6ff7a', 10);
        break;
      case 'shieldAll':
        for (const h of heroes) this.shield(h, h.maxHp * p);
        break;
      case 'bolt': {
        const t = enemies.sort((a, b) => b.hp - a.hp)[0];
        const from = new THREE.Vector3(-6, 7, 2);
        this.fx.shoot('bigorb', from, this.chest(t), {
          dur: 0.55,
          arc: 0.5,
          trail: '#ff9a3c',
          onHit: () => {
            sfx.boom();
            this.fx.shake = Math.max(this.fx.shake, 0.35);
            this.fx.ring(t.char.pos, '#ff6b3c', 2.6, 18);
            this.fx.burst(this.chest(t), '#ff9a3c', 22, { speed: 5, up: 3, size: 0.24 });
            this.damage(null, t, avg * p, { color: '#ff6b3c' });
          },
        });
        break;
      }
      case 'aoe':
        for (const e of enemies) {
          for (let k = 0; k < 3; k++) {
            const to = this.chest(e, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6));
            const from = to.clone().add(new THREE.Vector3(-2 + Math.random(), 10, Math.random() * 2));
            this.fx.shoot('star', from, to, {
              dur: 0.45 + k * 0.16 + Math.random() * 0.1,
              trail: '#ffe08a',
              spin: 12,
              onHit: () => {
                sfx.starHit();
                this.fx.burst(to, '#ffd34d', 8, { speed: 3, up: 2.5 });
                this.fx.shake = Math.max(this.fx.shake, 0.18);
                this.damage(null, e, (avg * p) / 3, { quiet: true, color: '#ffd34d' });
              },
            });
          }
        }
        break;
      case 'stunAll':
        for (const e of enemies) {
          this.stun(e, p);
          this.fx.setIce(e, true);
          this.fx.burst(this.chest(e), '#cfefff', 12, { speed: 3 });
        }
        break;
      case 'chain': {
        let from = this.chest(heroes[0] || this.units[0], 0.9);
        const order = [];
        for (let k = 0; k < 4 && enemies.length; k++) order.push(enemies[k % enemies.length]);
        order.forEach((e, k) =>
          setTimeout(() => {
            if (!e.alive) return;
            const to = this.chest(e);
            this.fx.bolt(from, to);
            from = to;
            sfx.zap();
            this.damage(null, e, avg * p, { quiet: true, color: '#c9a6ff' });
          }, (k * 110) / this.speed),
        );
        break;
      }
      case 'revive':
        for (const u of this.units)
          if (u.side === 'hero' && !u.alive) {
            u.alive = true;
            u.hp = Math.round(u.maxHp * p);
            u.char.ko = false;
            u.busy = false;
            u.timer = 0.8;
            u.bar.classList.remove('gone');
            this.fx.rise(u.char.pos, '#ff8fb1', 16, 0.8);
            this.fx.text(this.chest(u, 0.9), 'Up!', 'heal');
          }
        break;
    }
    this.onChange();
    return true;
  }

  autoCast() {
    const hs = this.heroes();
    const es = this.enemies();
    if (!es.length) return;
    const ratio = hs.reduce((a, h) => a + h.hp / h.maxHp, 0) / Math.max(1, hs.length);
    const lowest = Math.min(...hs.map((h) => h.hp / h.maxHp));
    const tough = es.some((e) => e.def.boss || e.def.elite) || es.length >= 3;
    const want = (kind) => {
      switch (kind) {
        case 'revive':
          return true;
        case 'healAll':
          return ratio < 0.6 || lowest < 0.3;
        case 'shieldAll':
          return lowest < 0.45;
        case 'stunAll':
        case 'aoe':
          return tough;
        default:
          return true;
      }
    };
    const order = [...this.cards.keys()].sort((a, b) => {
      const pr = { revive: 0, healAll: 1, shieldAll: 2, stunAll: 3, aoe: 4 };
      return (pr[ABILITIES[this.cards[a].id].kind] ?? 9) - (pr[ABILITIES[this.cards[b].id].kind] ?? 9);
    });
    for (const i of order) {
      const def = ABILITIES[this.cards[i].id];
      const defensive = ['revive', 'healAll', 'shieldAll'].includes(def.kind);
      const reserve = defensive ? 0 : 2;
      if (want(def.kind) && this.sparks >= this.cardCost(this.cards[i]) + reserve && this.canCast(i)) {
        this.cast(i);
        return;
      }
    }
  }

  // ------------------------------------------------------------ per frame

  update(rawDt) {
    let dt = rawDt;
    if (this.hitStop > 0) {
      this.hitStop -= rawDt;
      dt *= 0.12;
    }
    dt *= this.speed;
    this.time += dt;
    this.fx.update(dt);

    if (!this.over) {
      this.sparks = Math.min(MAX_SPARKS, this.sparks + dt * 0.55 * (this.mods.regenMul || 1));
      for (const c of this.cards) c.cd = Math.max(0, c.cd - dt);
      for (const k of ['atk', 'haste']) {
        if (this.buffs[k + 'T'] > 0) {
          this.buffs[k + 'T'] -= dt;
          if (this.buffs[k + 'T'] <= 0) this.buffs[k] = 0;
        }
      }
      if (this.auto) {
        this.autoT = (this.autoT || 0) - dt;
        if (this.autoT <= 0) {
          this.autoT = 0.5;
          this.autoCast();
        }
      }
    }

    for (const u of this.units) {
      u.char.update(dt);
      if (!u.alive) continue;
      // statuses
      if (u.stun > 0) {
        u.stun -= dt;
        if (u.stun <= 0) this.fx.setIce(u, false);
      }
      for (const k of ['poison', 'burn']) {
        const st = u[k];
        if (!st) continue;
        st.t -= dt;
        st.acc = (st.acc || 0) + st.dps * dt;
        st.show = (st.show ?? 0.6) - dt;
        if ((st.show <= 0 || st.t <= 0) && st.acc >= 1 && !this.over) {
          st.show = 0.6;
          const n = Math.floor(st.acc);
          st.acc -= n;
          u.hp -= n;
          this.fx.text(this.chest(u, 0.7), `${n}`, k);
          if (k === 'burn') this.fx.burst(this.chest(u, 0.5), '#ff9a3c', 3, { speed: 1, up: 2, life: 0.5 });
          if (u.hp <= 0) this.kill(u);
          this.onChange();
        }
        if (st.t <= 0) u[k] = null;
        if (!u.alive) break;
      }
      if (!u.alive) continue;
      u.char.tint = u.stun > 0 && this.fx.ices.has(u) ? TINT.ice : u.poison ? TINT.poison : u.burn ? TINT.burn : null;

      if (u.move) {
        const m = u.move;
        m.t += dt;
        const k = Math.min(1, m.t / m.dur);
        u.char.pos.lerpVectors(m.from, m.to, k);
        u.char.pos.y = FLOOR_Y + Math.sin(Math.PI * k) * Math.min(0.6, m.from.distanceTo(m.to) * 0.08);
        u.char.moving = true;
        if (k >= 1) {
          u.move = null;
          u.char.moving = false;
          u.char.pos.y = FLOOR_Y;
          m.then?.();
        }
        continue;
      }
      if (this.over || u.busy || u.stun > 0) continue;
      const haste = u.side === 'hero' ? (1 + this.buffs.haste) * (this.mods.spdMul || 1) : 1;
      u.timer -= dt * haste;
      if (u.timer <= 0) {
        u.timer = u.spd * (0.9 + Math.random() * 0.2);
        if (u.side === 'hero') this.heroAct(u);
        else this.enemyAct(u);
      }
    }
    // tidy away enemies that have finished shattering
    for (const u of this.units) if (u.side === 'enemy' && u.char.gone && !u.disposed) (u.disposed = true), u.char.dispose();

    this.updateBars();

    if (!this.over) {
      if (!this.enemies().length) this.finish('win');
      else if (!this.heroes().length) this.finish('lose');
    } else {
      this.endT += rawDt;
      if (this.endT > 2.1 && !this.ended) {
        this.ended = true;
        this.onEnd(this.over);
      }
    }
  }

  finish(result) {
    this.over = result;
    this.endT = 0;
    for (const u of this.units) {
      u.stun = 0;
      this.fx.setIce(u, false);
    }
    if (result === 'win') {
      sfx.victory();
      setTimeout(() => {
        for (const u of this.heroes()) {
          if (u.move) u.char.pos.copy(u.move.to);
          u.move = null;
          u.char.moving = false;
          u.char.pos.y = FLOOR_Y;
          u.char.yaw = HERO_FACE * 0.45;
          u.char.play('cheer', { dur: 1.6 });
        }
      }, 450);
    } else sfx.defeat();
  }

  updateBars() {
    const p = { x: 0, y: 0 };
    for (const u of this.units) {
      if (!u.bar.isConnected) continue;
      if (!u.alive && u.side === 'enemy') {
        u.bar.remove();
        continue;
      }
      const big = u === this.boss && u.def.boss;
      if (big) {
        u.bar.style.display = 'none';
        continue;
      }
      this.fx.screen(_v.set(u.char.pos.x, u.char.pos.y + u.char.height + 0.28, u.char.pos.z), p);
      u.bar.style.transform = `translate(${p.x}px, ${p.y}px)`;
      const w = Math.max(0, u.hp / u.maxHp);
      u.bar.firstChild.style.width = `${Math.min(1, (u.hp + u.shield) / u.maxHp) * 100}%`;
      u.bar.lastChild.style.width = `${w * 100}%`;
      u.bar.classList.toggle('stunned', u.stun > 0);
    }
    if (this.boss && this.ui.bossBar) {
      const b = this.boss;
      this.ui.bossBar.hidden = false;
      this.ui.bossBar.querySelector('.boss-name').textContent = b.name;
      this.ui.bossBar.querySelector('.boss-fill').style.width = `${Math.max(0, b.hp / b.maxHp) * 100}%`;
      this.ui.bossBar.querySelector('.boss-shield').style.width = `${Math.min(1, Math.max(0, (b.hp + b.shield) / b.maxHp)) * 100}%`;
    }
  }

  /** Write hero health back to the run and remove everything this battle created. */
  dispose() {
    for (const u of this.units) {
      u.bar.remove();
      if (u.side === 'hero') {
        u.hero.hp = u.alive ? Math.max(1, Math.round(u.hp)) : 0;
        u.char.tint = null;
        u.char.action = null;
        u.char.moving = false;
      } else if (!u.disposed) u.char.dispose();
    }
    this.fx.clearAll();
    if (this.ui.bossBar) this.ui.bossBar.hidden = true;
  }
}

const TINT = {
  poison: { color: new THREE.Color('#7dd65a'), k: 0.35 },
  burn: { color: new THREE.Color('#ff7a2f'), k: 0.3 },
  ice: { color: new THREE.Color('#bfe9ff'), k: 0.5 },
};
