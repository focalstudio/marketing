---
id: gameboy
name: Game Boy LCD
status: demo
family: "Pixel & retro"
engine: canvas
summary: "A four-shade green handheld LCD with chunky 8x8 tiles, shown on a dark device shell."
source: video/canvas/scenes/style_gameboy.mjs
previews_from: canvas style_gameboy 0.5,1.5,2.5
previews: 3
fonts: [Nunito]
used_in: []
palette:
  lcd-dark: "#0f380f"
  lcd-mid: "#306230"
  lcd-light: "#8bac0f"
  lcd-pale: "#9bbc0f"
  shell: "#74737a"
  bezel: "#34333f"
  button: "#8b2f57"
  page: "#1d1d21"
prompt: "Handheld console LCD look: 160x144 screen with exactly four shades of green (#0f380f #306230 #8bac0f #9bbc0f), dot-matrix pixel grid, 8x8 tiles, Bayer dither on clouds and hills, one-pixel dark outline. The 10:9 screen sits centred in a dark grey handheld shell with a DOT MATRIX bezel, d-pad and two round buttons below, filling a 9:16 frame. Subject: a pale rabbit beside a big 25:00 countdown panel with a block progress bar, a round tree and a carrot on a brick ground."
---

## Look
Four shades only, drawn on a 160x144 canvas and scaled x6 with a faint line between every pixel. Ground and bricks come from 8x8 tiles, the sky darkens by dither, sprites are outlined in the darkest shade. The screen is letterboxed in a dark device shell so the portrait frame stays full.

## Do
- Keep all four shades and nothing else on the screen; use dither for in-between tones.
- Build ground and walls from repeating 8x8 tiles.
- Frame the screen with a shell, bezel and generic buttons.

## Don't
- No brand marks, logos or console names; the bezel label stays generic.
- No smoothing, no colour outside the four greens inside the screen.

## Prompt recipe
Handheld LCD look: four shades of green, 160x144 dot-matrix screen, 8x8 tiles, Bayer dither, one-pixel outline, shown in a dark generic handheld shell. Subject: {subject}, 9:16.
