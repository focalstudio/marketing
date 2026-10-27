---
id: pixel
name: Pixel
status: in-use
family: "Pixel & retro"
engine: pillow
summary: "8 px pixel art on a fixed 26-colour palette with Bayer dither dissolves."
source: video/styles/pixel.py
previews_from: pillow meditate 1,4,8
previews: 3
fonts: [Nunito]
used_in: [meditate]
palette:
  outline: "#2e2030"
  white: "#fff8ee"
  sky: "#f39a8c"
  sky-pale: "#ffe4ae"
  sun: "#ffc84c"
  meadow: "#b6d66e"
  meadow-deep: "#4e9656"
  fur: "#8cbaf8"
  hoodie: "#f06e5e"
  fox: "#ee8034"
prompt: "8-bit pixel art, 135x240 canvas upscaled 8x, fixed 26-colour palette, golden-hour sky in four bands, Bayer dithering, one-pixel dark outline. Subject: a blue rabbit in a red hoodie meditating on a stone in a green meadow, 9:16."
---

## Look
A 135 x 240 logical canvas drawn with a fixed palette and scaled 8x, so every pixel is a block. Sky bands, a pixel sun, dithered transitions and gait cycles at 30 fps.

## Do
- Quantise every sprite to the palette (`nearest()` in the module).
- Use the Bayer matrix for fades and dissolves.
- Keep the outline one logical pixel wide.

## Don't
- No smooth scaling, rotation or anti-aliased edges.
- No colour outside the palette, not even for the app icon surround.

## Prompt recipe
8-bit pixel art on a low-res canvas upscaled with nearest neighbour, fixed palette, Bayer dithering, one-pixel outline. Subject: {subject}, 9:16.
