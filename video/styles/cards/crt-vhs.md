---
id: crt-vhs
name: CRT and VHS
status: demo
family: "Pixel & retro"
engine: canvas
summary: "Flat shapes seen on a worn tape and a tube TV: scanlines, RGB bleed, tracking noise and a PLAY overlay."
source: video/canvas/scenes/style_crt_vhs.mjs
previews_from: canvas style_crt_vhs 0.5,1.5,2.5
previews: 3
fonts: [Nunito]
used_in: []
palette:
  night: "#2b2057"
  dusk: "#d8477a"
  glow: "#ff9a4d"
  sun: "#ffe27a"
  meadow: "#3ba070"
  panel: "#1a1233"
  fur: "#dfe8ff"
  pink: "#ff9fb8"
prompt: "VHS tape played on a CRT television: flat vector shapes softened and bled with red and blue channel offsets, horizontal line jitter, a rolling tracking band with white snow, scanlines, a head-switching skew at the bottom, dark vignette and rounded screen corners, blocky bitmap PLAY with a triangle and a tape counter in white with red and cyan fringes. Subject: a white rabbit with pink ears and a big yellow 25:00 timer board on a banded purple-to-orange sunset meadow with a carrot, 9:16."
---

## Look
A simple flat picture drawn at half size, sliced into 4 px lines that jitter sideways (more inside a rolling tracking band, skewed over the last lines), then split into R, G and B and slid apart. Scanlines, vignette and rounded corners finish the tube; the overlay is a bitmap PLAY and counter.

## Do
- Start from flat, high-contrast shapes so the colour fringes show.
- Seed the jitter and snow from the frame number so frames repeat exactly.
- Give overlay text a red and a cyan fringe, white on top.

## Don't
- No smooth gradients in the picture; the tube supplies the softness.
- Don't jitter the whole frame at once: lines move, the picture stays put.

## Prompt recipe
VHS tape on a CRT: flat shapes, RGB channel bleed, line jitter, a tracking band with snow, scanlines, vignette, rounded corners, bitmap PLAY and counter overlay. Subject: {subject}, 9:16.
