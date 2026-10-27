---
id: lowpoly-3d
name: Low-poly 3D
status: demo
family: "Low poly & 3D"
engine: blender
summary: "Real faceted 3D geometry with flat shading and one soft golden sun, in pastel greens."
source: video/blender/styles/lowpoly_3d.py
previews_from: blender lowpoly-3d 1,12,24
previews: 3
fonts: [Nunito]
used_in: []
palette:
  sky: "#fbe3c8"
  grass: "#9fd18b"
  grass-dark: "#6fb47a"
  fur: "#f6e9df"
  fur-shade: "#f0d3cc"
  ear-inner: "#f2a7b5"
  rock: "#b9b4c9"
  sun: "#ffd9a0"
  timer: "#8fcf9c"
  timer-text: "#fff8e8"
prompt: "Low-poly 3D render, real faceted geometry with flat shading, a single soft golden sun with long shadows, pastel greens, peach sky, distant lilac mountains. Subject: a cream rabbit sitting on a floating octagonal grass island with a few pine cones, a pink-grey rock, a small sapling with a pink bud and a big mint-green 25:00 timer sign floating above, 9:16."
---

## Look
Every form is a handful of flat triangles, so each facet catches its own tone from one golden sun. Pastel greens, a peach sky and pale mountains keep it calm. The island is an octagonal slab seen from slightly above.

## Do
- Keep sphere detail low (ico sphere, one subdivision) and shade flat.
- Light with one warm sun and a faint cool fill.
- Build trees and mountains from cones with five or six sides.

## Don't
- No smooth shading, bevels or subdivision on the subject.
- No textures: colour comes from the facets and the light.

## Prompt recipe
Low-poly 3D, flat-shaded facets, one soft golden sun, pastel greens and peach sky. Subject: {subject}, 9:16.
