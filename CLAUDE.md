# Emberdelve (working folder: voxel-battler)

Zach's cozy **idle auto-battler + roguelike dungeon crawl** in the voxel style of his Voxel Focus World app.
A little camp on a floating island is the hub; the Delve Gate drops the party into a seeded, procedural
dungeon (branching map → idle battles where you fire ability cards → rewards → boss) and they come home with
**embers** that build and upgrade the camp. Original design: no characters, names, art or levels from any
existing game. Every visual is procedural voxels (no downloaded assets, fonts, sounds or models).

- Stack: Vite 8, three 0.187, tone 15. No other runtime deps. Sound/music are generated with Tone.js.
- Run: `npm run dev` (launch config **voxel-battler**, port **5205**); `npm run build` → `dist/` (PWA, relative
  URLs, works on GitHub Pages); `npm run preview` (launch config **voxel-battler-build**, port 5206).
- Character lab: `http://localhost:5205/gallery.html?set=heroes|hollow|grotto&tier=0..2` (dev only, buttons for
  every animation). Use it when touching character designs.
- Debug handle in the browser console: `vd` (`vd.save`, `vd.state`, `vd.battle`, `vd.addEmbers(100)`,
  `vd.win()`, `vd.lose()`, `vd.reset()`).
- Save: localStorage key `vdelve.save.v1` (`src/save.js`). The current delve is saved too, so a reload resumes
  it (pending reward/shop/event, or the end-of-run sheet via `run.over`).
- GitHub: https://github.com/Zachary-Malcolm/emberdelve (**private**, branch `master`). Ask Zach before making it public or turning on GitHub Pages.

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
  (start each delve with a random relic). Buildings drop in block by block (IslandFX). Heroes wander by day and
  sit round the fire at night. Tap a hero for their sheet; tap a building or its floating tag.
- **Map**: 7 rows + boss (`makeMap` in data.js), non-crossing branching paths, seeded per run. Node types:
  battle, elite (drops a relic), event, peddler (shop), campfire (rest or train), boss.
- **Battle** (battle.js): fully automatic. Each unit has an action timer (`spd` seconds). Heroes have a basic
  attack and a skill every N attacks. The player spends **sparks** (regenerate over time, max 10) on up to 5
  **ability cards** (keys 1–5 also work). `Auto` lets the party cast on its own; `1x/2x` speed.
  KO'd heroes revive at 30% after a won fight; losing a fight ends the delve (embers are kept).
- **Rewards**: gold (spent at the peddler) and embers (kept forever) per fight; then choose 1 of 3–5:
  a new ability, an upgrade (+1/+2), or training a hero (+15% power, +10% hp for the run).
- **Biomes**: Mossy Hollow, then Crystal Grotto unlocks after the first boss (tier 1 = +3 enemy levels).
  Beating bosses also raises later delve levels a little (`encounterFor`).

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
| enemies.js | 11 enemies over 2 biomes (incl. 2 elites + 2 bosses), `ENEMIES`, `BIOMES` |
| data.js | Seeded helpers, `ABILITIES`, `RELICS`, `makeMap`, `encounterFor`, `enemyStats`, `EVENTS` |
| arena.js | `Arena`: builds each room as a floating rock chunk at y = −140 (floor, back wall, edge decor, braziers, campfire/stall/shrine) |
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

## Ideas / next steps
- Portrait phones: a vertical battle layout (heroes bottom, enemies top) would let characters be bigger.
- More biomes (each = 5–6 enemies, an elite, a boss, decor function, palette), more events and relics.
- Hero levels that persist between delves; a codex of met enemies; daily seeded delve.
- Sentinel's mask could read less like a bucket; Grubkin ears could be bigger.
