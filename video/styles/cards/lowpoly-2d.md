---
id: lowpoly-2d
name: Low poly 2D
status: demo
family: "Low poly & 3D"
engine: canvas
summary: "Flat-shaded triangle facets in plain canvas 2D, lit from the upper left, with no outlines."
source: video/canvas/scenes/style_lowpoly_2d.mjs
previews_from: canvas style_lowpoly_2d 0.5,1.5,2.5
previews: 3
fonts: [Nunito]
used_in: []
palette:
  sky-top: "#4a5fc1"
  sky-mid: "#8f8ee0"
  sky-low: "#f0a6b8"
  horizon: "#fbd6a2"
  fur-shade: "#a2879f"
  fur-light: "#ffeede"
  ear: "#ffb7c5"
  meadow-shade: "#2c6b5a"
  meadow-light: "#b9e27e"
  timer: "#0f5f6a"
prompt: "Low poly illustration, every shape built from flat-shaded triangles, no outlines, one light from the upper left so each facet is a different tone, a soft dusk gradient sky made of facets, faceted mountains. Subject: a cream rabbit sitting beside a big teal 25:00 timer on a faceted green meadow under a violet and peach sky, 9:16."
---

## Look
Sky, mountains, meadow, rabbit and timer are all triangle meshes. Each facet takes its tone from its normal against one fixed upper-left light, with a small seeded jitter, so rounded forms read as polygons. It is the cheap 2D sibling of the Pillow `lowpoly` style and the planned Blender one.

## Do
- Keep facets visible: 8 to 14 per rounded part.
- Light every mesh from the upper left and shade the lower right darker.
- Build the sky gradient out of facets too.

## Don't
- No outlines, blur or smooth gradients inside a facet.
- No more than one light and no cast textures.

## Prompt recipe
Low poly illustration, all shapes flat-shaded triangles, no outlines, one upper-left light, dusk sky gradient made of facets. Subject: {subject}, 9:16.
