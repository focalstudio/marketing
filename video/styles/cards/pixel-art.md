---
id: pixel-art
name: Pixel art (canvas)
status: planned
engine: canvas
summary: "A canvas port of the Pillow pixel style, so any scene can play in 8-bit."
previews: 0
fonts: [Nunito]
used_in: []
palette:
  outline: "#2e2030"
  white: "#fff8ee"
  sky: "#f39a8c"
  sun: "#ffc84c"
  meadow: "#b6d66e"
  fur: "#8cbaf8"
prompt: "8-bit pixel art, 135x240 canvas upscaled with nearest neighbour, locked palette, Bayer dithering, one-pixel outline. Subject: a rabbit watching a pixel sunset from a hilltop, 9:16."
---

## Look
Draw to a small palette-locked canvas and upscale with nearest neighbour. Reuses the palette rule in `video/styles/pixel.py:18-29`.

## Do
- Lint every colour against the palette.

## Don't
- No smoothing at any step.

## Prompt recipe
8-bit pixel art, low-res canvas upscaled with nearest neighbour, locked palette, Bayer dithering. Subject: {subject}, 9:16.
