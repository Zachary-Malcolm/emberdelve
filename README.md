# Emberdelve

A cozy voxel idle auto-battler with a roguelike dungeon crawl. Build up a little camp on a floating island,
then send your party down the Delve Gate: every delve is a new seeded dungeon with branching paths, battles
that play themselves while you fire ability cards, events, a peddler, campfires and a boss at the bottom.
The embers you bring home build and upgrade the camp.

- Every model is made procedurally from voxels: heroes and monsters are part-rigged voxel characters with idle,
  attack, hurt, knock-out and shatter animations. No downloaded art, fonts or sounds.
- Music and sound effects are generated live with Tone.js.
- Progress is saved in the browser; the app works offline once loaded.

Built with Three.js, Tone.js and Vite. The scene, sky, island and build animations grew out of
[Voxel Focus World](https://github.com/Zachary-Malcolm/voxel-focus-world).

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes a static site to `dist/` (relative URLs, so it works on GitHub Pages).
