---
id: paper
name: Paper
status: in-use
engine: pillow
summary: "Layered cutout paper with torn edges, soft shadows and stop-motion sway."
source: video/styles/paper.py
previews_from: pillow meditate 1,4,8
previews: 3
fonts: [Nunito]
used_in: [meditate, collect, phone_down, night_owls, rare_find, slow_lane, stay_awhile, short_break]
palette:
  sky-top: "#b0d6e2"
  sky-low: "#fceed0"
  sun: "#fcde8c"
  cloud: "#fffcf4"
  hill-far: "#96bcbe"
  hill-mid: "#76a884"
  hill-near: "#60966a"
  meadow: "#548654"
prompt: "Layered cutout paper diorama: torn-edge sheets for sky, hills and pines, soft drop shadows between layers, paper grain, gentle parallax sway, stop-motion at 12 poses a second. Subject: a white rabbit sitting in a meadow at golden hour, 9:16."
---

## Look
Sheets of paper at different depths sway on their own. Every animal is cut from paper pieces that cast a soft shadow on the ones below, and poses change 12 times a second.

## Do
- Tear the edges and offset each layer a little.
- Cast a soft shadow from every piece onto the layer below.
- Keep the motion stepped.

## Don't
- No outlines on the animals.
- No smooth interpolation: it should feel stop-motion.

## Prompt recipe
Layered cutout paper diorama, torn edges, soft shadows between layers, paper grain, stop-motion at 12 poses a second. Subject: {subject}, 9:16.
