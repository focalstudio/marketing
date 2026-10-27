---
id: toon-3d
name: Toon 3D
status: demo
family: "Low poly & 3D"
engine: blender
summary: "3D forms cel-shaded into three flat tone bands with a thick dark Freestyle ink outline."
source: video/blender/styles/toon_3d.py
previews_from: blender toon-3d 1,12,24
previews: 3
fonts: [Nunito]
used_in: []
palette:
  ink: "#2b1d3a"
  wall: "#7fd6ff"
  grass: "#86d36a"
  grass-shade: "#3f9e6a"
  fur: "#fff4ea"
  fur-shade: "#b9a6e6"
  pink: "#ff7fa3"
  rock: "#9db4e8"
  timer: "#ff8a5b"
  timer-text: "#fff8e6"
prompt: "Cel-shaded 3D render, three flat tone bands per object (shade, base, light), one hard shadow shape, thick dark purple ink outline, flat sky-blue background. Subject: a white rabbit with lilac shadows sitting on a bright green island next to a blue rock and a small sapling, an orange 25:00 sign with cream digits above, 9:16."
---

## Look
Real 3D lit by one sun, then flattened: a Shader to RGB ramp gives shade, base and light bands, and a Freestyle line adds a uniform dark ink outline. Backgrounds stay flat.

## Do
- Quantise lighting with a constant colour ramp, not a smooth one.
- Pick a hue-shifted shade colour for each material.
- Keep the digits and the sky outline-free.

## Don't
- No soft shading or gradients inside a band.
- No thin lines: the outline is the heaviest thing on screen.

## Prompt recipe
Cel-shaded 3D, three flat tone bands, thick dark ink outline, flat background. Subject: {subject}, 9:16.
