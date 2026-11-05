# Emberdelve (working folder: voxel-battler)

Zach's cozy **idle auto-battler + roguelike dungeon crawl** in the voxel style of his Voxel Focus World app.
A little camp on a floating island is the hub; the Delve Gate drops the party into a seeded, procedural
dungeon (branching map → idle battles where you fire ability cards → rewards → boss) and they come home with
**embers** that build and upgrade the camp. Original design: no characters, names, art or levels from any
existing game. Every visual is procedural voxels (no downloaded assets, fonts, sounds or models).

- Stack: Vite 8, three 0.187, tone 15. No other runtime deps. Sound/music are generated with Tone.js.
- Run: `npm run dev` (launch config **voxel-battler**, port **5205**); `npm run build` → `dist/` (PWA, relative
  URLs, works on GitHub Pages); `npm run preview` (launch config **voxel-battler-build**, port 5206).
- Character lab: `http://localhost:5205/gallery.html?set=heroes|<biome key>&tier=0..2&charm=<rarity>&only=id1,id2`
  (dev only, buttons for every animation). Use it when touching character designs.
- Debug handle in the browser console: `vd` (`vd.save`, `vd.state`, `vd.battle`, `vd.addEmbers(100)`,
  `vd.win()`, `vd.lose()`, `vd.reset()`, `vd.loot('boss', n)` fills the Storehouse, `vd.chest('elite')` plays a
  chest in the arena, `vd.go('elite'|'boss'|…)` jumps to the first node of that type during a delve,
  `vd.unlockAll()` opens every biome, `vd.xp(100)` gives the roster experience).
- Save: localStorage key `vdelve.save.v1` (`src/save.js`). The current delve is saved too, so a reload resumes
  it (pending reward/shop/event, or the end-of-run sheet via `run.over`).
- GitHub: https://github.com/Zachary-Malcolm/emberdelve (**public** since 2026-11-05, at Zach's request; source on
  `master`). Playable at **https://zachary-malcolm.github.io/emberdelve/** (GitHub Pages from the `gh-pages` branch,
  which holds only the built `dist/`). To deploy a new build: `npm run build`, copy `dist/` into an empty temp
  folder, add an empty `.nojekyll`, `git init -b gh-pages`, commit, and force-push it to the `gh-pages` branch.
  Only deploy when Zach asks.

## Rules from Zach
- Original design only, never a copy of an existing game's look, characters, names or levels. Genre mechanics are fine.
- Ask before downloading anything beyond normal npm packages (no asset packs, models, fonts, sounds).
- Slow, cozy, not stressful, but addictive; satisfying sound and animation. Character design is the top priority.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not edit anything inside `../voxel-focus-world`; copy from it instead.

## Game loop (src/main.js state machine)
`camp → descend → map → travel → battle | event | shop | rest → reward → map … → boss → over → ascend → camp`

- **Camp**: island from Focus World's `generateIsland`, stone plaza + campfire, six building sites
  (`BUILDINGS` in base.js): Delve Gate (start a run), Forge (gear tiers: +15% hp/power each, shows on the
  model), Tavern (party of up to 4, recruit Duskblade/Tinker), Herb Garden (better rests; L2 heals after
  fights), Spark Spire (L1 +2 starting sparks, L2 faster sparks, L3 an extra reward choice), Relic Archive
  (start each delve with a random relic), Storehouse (built from the start: trinket stash, 12 slots, Lv 2 = 24).
  Buildings drop in block by block (IslandFX). Heroes wander by day and
  sit round the fire at night. Tap a hero for their sheet; tap a building or its floating tag.
- **Map**: 7 rows + boss (`makeMap` in data.js), non-crossing branching paths, seeded per run. Node types:
  battle, elite (drops a relic), event, peddler (shop), campfire (rest or train), boss.
- **Battle** (battle.js): fully automatic. Each unit has an action timer (`spd` seconds). Heroes have a basic
  attack and a skill every N attacks. The player spends **sparks** (regenerate over time, max 10) on up to 5
  **ability cards** (keys 1–5 also work). `Auto` lets the party cast on its own; `1x/2x` speed.
  KO'd heroes revive at 30% after a won fight; losing a fight ends the delve (embers are kept).
- **Rewards**: gold (spent at the peddler) and embers (kept forever) per fight; then choose 1 of 3–5:
  a new ability, an upgrade (+1/+2), or training a hero (+15% power, +10% hp for the run).
- **Chests and trinkets** (items.js, chest.js): elites drop a chest with 1 trinket, bosses a gold chest with 2
  (the second at least rare). Rarities common → uncommon → rare → epic → legendary → mythic. Trinkets go to the
  Storehouse at camp; each hero wears one (Storehouse or tap a hero). Spares melt into embers. When the
  Storehouse is full, the weakest spare is melted to make room for a rarer find.
  **Balance rule:** a trinket is always weaker than one Forge tier (+15% hp and power). Stat budget 4/6/8/10/11/12%
  (two stats from rare up, each ~58% of the budget; guard counts 0.8x). Legendary adds a small effect (start
  shield, regen, thorns, leech, +1 spark, first-hit crit); mythics are unique (Phoenix Plume, Echo Bell,
  Sparkheart). Effects live in battle.js (`u.gear`).
- **Camera**: in the dungeon the camera orbits and zooms like at camp (tilt capped so you can't look under the
  floor); the eye button in the top bar re-frames the arena.
- **Portrait phones** (aspect < 0.9): the camera looks along +x from behind the heroes, so heroes are at the
  bottom of the screen and enemies at the top, and characters are drawn big. `layout.portrait` (battle.js)
  switches facing (`faceFor`: everyone turns inwards), `arena.build(…, { portrait })` keeps near decor low and
  moves the braziers to the sides. Turning the phone between rooms rebuilds the room the new way.
- **Hero levels** (main.js `levelInfo`): XP per won battle (10 / elite 25 / boss 60, +25% per biome tier) to
  everyone in the party, kept between delves. Level cost 40, 70, 100, … up to level 10; +2.5% health and power
  per level (max +22.5%). Level-ups pop over the hero; shown on hero chips, the hero sheet and map chips.
- **Trinkets on models**: the worn trinket hangs as a little charm on the right hip (`heroSpec(id, tier, charm)`),
  in the rarity colour; rare and up glow, legendary gets a sparkle, mythic an extra orb.
- **Daily delve** (Delve Gate): the seed comes from the local date, so it is the same map all day. First clear of
  the day gives +25 embers; best floor, tries and a clear streak are kept in `save.daily`.
- **Delve Gate biome picker**: "Surprise me" or any unlocked biome (`save.gateBiome`); only the next locked one
  is hinted.
- **Journal** (book button, camp only; journal.js): creatures per biome (portrait or silhouette, times beaten,
  trait), trinkets found by rarity + legendary effects + mythics, records. `save.seen` tracks it.
- **Go home**: the map's "Go home" ends a delve early (embers and trinkets are kept).
- **Biomes**: Mossy Hollow → Crystal Grotto → Cinder Deeps, each unlocked by beating a boss (the order of
  `BIOME_LIST`). `tier` adds +3 enemy levels per tier and better chest odds (capped at 4 tiers). Beating bosses
  also raises later delve levels a little (`encounterFor`).
- **Relics** (data.js `RELICS`, effects in `runMods` / main.js / battle.js): 20, incl. Copper Kettle (start shield),
  Pocket Bellows (faster sparks), Sleepy Mask (enemies 8% slower), Honey Pot (better rests), Treasure Map
  (+6 gold a battle), Rusty Key (12% small chest from normal battles). Events: 14 in `EVENTS`.

## Adding biomes and enemies (built to grow to ~50 biomes / 100+ enemies)
Each biome is one file in `src/biomes/` holding everything about it:
- enemy model builders (functions returning a rig spec, see chars.js), `builders` map id → builder,
- `enemies` map id → stats (`name, hp, atk, spd, attack, melee, scale, size, trait?, elite?/boss?, summon?,
  bolt?, slamAll?: ring colour for a boss area slam every 3rd action, slamBurn?`),
- `biome`: `key, tier, name, pools` (3–4 enemy groups), `elites, boss`, palette (`floor, floor2, wall, accent,
  light, fog, sky`, optional `lava`), `floorMat(n)` → floor material per tile (`'ember'` = glowing, kept off the
  fighting floor), `decor(add, rng, x, z, low)` → edge props (when `low`, only short things: they sit between
  the camera and the fight).
Then add it to `BIOME_LIST` in `src/biomes/index.js`. `enemies.js` merges everything into `ENEMIES`/`BIOMES` and
throws on duplicate ids. The Journal, Delve Gate, gallery (`?set=<key>`) and unlock order pick it up
automatically. New traits need a few lines in battle.js (`enemyAct`, `damage`) and a sentence in journal.js
`TRAITS`. Keep a biome's enemies inside its palette family, and give every enemy one readable silhouette idea.
Balance note for many biomes: enemy level grows +3 per tier, so very deep tiers will need a softer curve (or
more hero growth) before there are dozens of them.

## Character design system (src/chars.js) — read before touching any model
- Units: **1 px = 1/16 world unit**; a standard hero is ~22 px tall (≈1.4 world units, about 1.4 floor blocks).
- **Proportions** (humanBody): big head 9×8×8 px on a 8×7.2×5 torso, short 3-px legs with boots, chunky
  hands. The head is ~40% of the height, so faces read at small sizes. Eyes are 2-px tall dark blocks with a
  white highlight, set at the front face of the head (eye bone at z 4.3); blush blocks under them.
- **Silhouette first**: each class owns one big shape that reads even as a silhouette: Bram's tall coral crest
  and tower shield, Wren's pointed hood and bow, Odo's huge crooked hat and orb staff, Lumi's space buns and
  lantern staff, Vex's hair spires and scarf tails, Pip's backpack chimney and goggles.
- **Palette**: each character uses ~4 main colours (skin, primary cloth, secondary/trim, accent) plus one glow
  colour (class identity colour in `HEROES[id].color`). Enemies use their biome's palette (`BIOMES`).
- **Rig**: bones with absolute pivots (`p`) and optional rest rotations; parts are authored in absolute px
  coordinates around the character's feet. Per-frame poses (`rx,ry,rz,dx,dy,dz,sx,sy,sz`) per bone.
  Parts with `opt` only show when a pose asks (e.g. KO stars).
- **Animators**: human, blob, bug, flyer, golem; shared layers for spawn (drop + squash), hurt (recoil + white
  flash), blink, KO (lie down, stars), cheer/wave/sit, and death = the model shatters into its voxels.
- Facing: models face +z; `yaw = atan2(dx, dz)`. Heroes stand at yaw π/2−0.45, enemies at −π/2+0.45, i.e.
  three-quarter towards the camera.
- Gear tiers change the model (trim colour → metal → glowing accents) via `heroSpec(id, tier)`.
- Glow parts use the `magic` material: a shader patch makes emissive = the instance colour (kit.js `tinted`).

## Code map (src/)
| File | What |
| --- | --- |
| main.js | State machine, camp UI, map screen, travel, battle panel, rewards, shop, rest, events, run start/end, save/resume, main loop, `vd` debug handle |
| battle.js | `Battle` (units, timers, AI, damage/heal/shield/stun/poison/burn, traits, cards, auto-cast, hp bars), formations (`layout.x` squeezes them on tall phones) |
| chars.js | Voxel character rig + animators + `Character` class |
| heroes.js | 6 hero builders, `HEROES` stats/roles, `STARTERS`, `RECRUITS` |
| biomes/*.js | One file per biome: enemy models + stats, palette, floor + decor (`index.js` = `BIOME_LIST`, the unlock order) |
| enemies.js | Registry: merges the biome files into `ENEMIES`, `BIOMES`, `enemySpec`, `biomeEnemies` |
| journal.js | The Journal sheet (creatures, trinkets, records) and trait descriptions |
| data.js | Seeded helpers, `ABILITIES`, `RELICS`, `makeMap`, `encounterFor`, `enemyStats`, `EVENTS` |
| items.js | Trinket rarities, stats, effects, mythics, chest drop odds (`chestLoot`), Storehouse sizes |
| chest.js | Voxel loot chest on the character rig with its own animator (`spec.animate`) |
| arena.js | `Arena`: builds each room as a floating rock chunk at y = −140 (floor, back wall, the biome's edge decor, braziers, campfire/stall/shrine); portrait option |
| fx.js | `BattleFX`: projectiles, bursts, rings, bolts, shield bubbles, ice, floating numbers, screen shake |
| base.js | `Base`: the camp island, building sites, building drop-in, camp heroes |
| portraits.js | Renders a hero/enemy head-and-shoulders PNG (cached) for the UI |
| icons.js | 12×12 pixel icons from character grids (no icon font) |
| audio.js | Focus World's generative music + sounds, plus battle sounds and `setMood(camp/delve/boss)` |
| save.js | Load/store/wipe |
| Copied from Focus World (lightly or not changed) | kit.js (materials, `MultiBatch` instancing; added skin/eye/leather/fur/bone/magic/ember/fabric/grain + `setMatrix`), scene.js, sky.js, rig.js, island.js, islandfx.js, voxels.js, rng.js, blueprints.js, builds*.js, sw-template.js (cache prefix `vdelve-`) |

## Verified (2026-11-04, built-in browser preview)
- Camp renders (night and day lighting from the live clock), tags, party strip; building the Forge drops it in
  and the camera flies there and back; embers deducted and saved.
- A full delve with an autopilot: map → battles (auto + manual card casts) → reward choices → event →
  peddler → campfire → boss (Old Rootheart) → victory sheet → back to camp. Embers, stats and the unlocked
  Crystal Grotto persisted. Resuming after a reload works mid-run and on the end-of-run sheet.
- Phone width (375×812): camp fits, map, battle (squeezed formation) and event sheets checked.
- `npm run build` is clean; the built app loads with no console errors and registers the service worker.
- Not verified: how audio actually sounds (the browser pane cannot be listened to); Crystal Grotto battles and
  the sentinel boss in the real game (only in the gallery); balance beyond one Hollow run (it felt easy-ish,
  so enemy hp/atk were raised a bit afterwards: `enemyStats`).
- Note: when the browser pane is hidden, animation frames are throttled; travel uses game-time waits
  (`after()` in main.js) so nothing gets stuck, but floors assemble slowly in that state.

- 2026-11-05: chests (elite + boss, in the real flow), Storehouse sheet, giving and melting trinkets, hero
  sheet slot, a full Storehouse, dungeon orbit/zoom + reset, Go home, resuming an event at its outcome, phone
  width for the reward and Storehouse sheets. Mythic effects checked in a boss fight without errors (Phoenix
  revive seen); their exact numbers are not tuned by play yet.

- 2026-11-05 (later): Cinder Deeps in the real game on a tall phone-shaped pane (portrait layout: battle,
  elite with enrage + chest, boss with summons, burning slams, victory sheet with level-ups), hero levels and
  XP, Copper Kettle shields, Journal (all three tabs), Delve Gate biome picker + daily delve start, hero sheet
  XP bar, the charm on a camp hero, and switching to a wide screen mid-delve (room rebuilt side-on).
  Not verified: the daily clear bonus and streak (needs a full daily win), Rusty Key / Treasure Map / Honey Pot /
  Sleepy Mask / Pocket Bellows in play, every new event.

## Ideas / next steps
- More biomes (each = 5–6 enemies, an elite, a boss, decor, palette): see "Adding biomes" above.
- Kilnkeeper and Cinder Crab are only checked in the gallery so far.
- Sentinel's mask could read less like a bucket; Grubkin ears could be bigger.
