---
id: pixel-art
name: Pixel art (canvas)
status: demo
family: "Pixel & retro"
engine: canvas
summary: "A canvas port of the Pillow pixel style, so any scene can play in 8-bit."
source: video/canvas/scenes/style_pixel_art.mjs
previews_from: canvas style_pixel_art 0.5,1.5,2.5
previews: 3
fonts: []
used_in: [picnic_for_four_pixel]
palette:
  outline: "#2e2030"
  white: "#fff8ee"
  sky: "#f39a8c"
  sky-low: "#fccf98"
  sun: "#ffc84c"
  meadow: "#b6d66e"
  grass: "#4e9656"
  fur: "#8cbaf8"
  fur-shade: "#5f82d6"
  wood: "#8f5e3d"
prompt: "8-bit pixel art, 135x240 canvas upscaled 8x with nearest neighbour, locked 26-colour palette, golden-hour sky in four bands joined by Bayer dithering, one-pixel dark outline round every sprite, chunky bitmap digits. Subject: a blue rabbit with pink ears sitting on a sunset meadow beside a wooden signboard that shows a big amber 25:00 countdown, a carrot and a rock in the grass, 9:16."
---

## Look
Draw to a small palette-locked canvas (135x240, x8) and upscale with nearest neighbour. Reuses the palette rule in `video/styles/pixel.py:18-29`. Sky bands meet in 4x4 Bayer dither, sprites get a one-pixel outline, text is a 3x5 bitmap font. The kit is `video/canvas/pixel.mjs`.

## Do
- Lint every colour against the palette (the canvas throws on a stray one); snap computed colours with `snapper`.
- Keep coordinates whole pixels; draw sprites on their own layer so the outline wraps them and not the scenery.
- Dither between neighbouring palette colours instead of mixing new ones.

## Don't
- No smoothing at any step, no anti-aliased arcs or text.
- No translucent shadows: use a checker of one palette colour.

## Prompt recipe
8-bit pixel art, low-res canvas upscaled with nearest neighbour, locked palette, Bayer dithering, one-pixel outline. Subject: {subject}, 9:16.
