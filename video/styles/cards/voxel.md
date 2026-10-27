---
id: voxel
name: Voxel
status: demo
family: "Low poly & 3D"
engine: blender
summary: "Blocky world and rabbit built from cubes on a grid, lit like a block game."
source: video/blender/styles/voxel.py
previews_from: blender voxel 1,12,24
previews: 3
fonts: [Nunito]
used_in: []
palette:
  sky: "#8fd3f4"
  grass: "#6cc24a"
  grass-2: "#5bb040"
  dirt: "#9a6b43"
  fur: "#ece4d9"
  pink: "#f08aa4"
  stone: "#8e949c"
  leaf: "#3f9a3a"
  timer: "#3a3f4d"
  timer-text: "#ffd84a"
prompt: "Voxel art 3D render, everything built from cubes on a grid, flat-coloured blocks, a bright sun with crisp shadows, clear blue sky. Subject: a white blocky rabbit with pink ears sitting on a grass-block island with a grey stone pile, a pink-flowered sapling, square trees behind and a dark slab with yellow block digits reading 25:00 above, 9:16."
---

## Look
Cubes only: the rabbit, the grass and dirt layers, the trees and even the timer digits are blocks on a regular grid. Bright primaries, a clear sky and a single sun give hard block shadows.

## Do
- Keep one cube size for the rabbit and a larger one for the world.
- Hide inner faces and shade flat so only block edges read.
- Draw text as a bitmap of cubes, not as a font.

## Don't
- No bevels, smoothing or rotated parts that break the grid.
- No more than two greens in the ground, laid in a checker.

## Prompt recipe
Voxel 3D, everything made of cubes on a grid, flat blocks, bright sun, clear sky. Subject: {subject}, 9:16.
