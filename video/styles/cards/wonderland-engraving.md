---
id: wonderland-engraving
name: Wonderland engraving
status: demo
family: "Ink & engraving"
engine: canvas
summary: "Victorian wood-engraving: flat shapes modelled with dense parallel and cross hatching, a ruled border and a serif plate caption."
source: video/canvas/scenes/style_wonderland-engraving.mjs
previews_from: canvas style_wonderland-engraving 0.5,1.5,2.5
previews: 3
fonts: [IM Fell DW Pica]
used_in: []
palette:
  paper: "#efe7d6"
  ink: "#2f2924"
  ink-wash: "#b9b2a4"
  hatch-light: "#8f887d"
prompt: "Victorian wood engraving, portrait 9:16: only cream paper and dark brown ink, every shape flat and modelled with dense parallel hatching and cross-hatching on its lower-right side (light from the upper left), short fur flicks on the lit side, a sky of ruled horizontal lines fading to the horizon, a double ruled border with diamond corners, a serif caption beneath (IM Fell DW Pica, Twenty-five Minutes of Quiet.). Subject: a rabbit sitting in profile beside a large arched alarm-clock style timer reading 25:00 on a grassy plain with hills and clouds, the pen lines redrawn six times a second."
---

## Look
Paper and ink only. Form comes from line density: sparse flicks where the light falls, parallel hatching on the shadow side and cross-hatching in the darkest part, with a heavier outline on the shadow edge. Ruled double border, a plate title and a serif caption. Pen lines boil six times a second; the hatching stays put. Reuses `pen`, `hatch`, `dashes` and `boil` from `video/canvas/ink.mjs`.

## Do
- Keep one light direction (upper left) for every shape and cast shadow.
- Let line density, never grey fill, make a shape look round.

## Don't
- No colour at all, no soft shading and no gradients.
- No copy of any specific illustrator's characters.

## Prompt recipe
Victorian wood engraving, only paper and ink, flat shapes modelled with dense parallel and cross hatching, ruled border, serif caption beneath. Subject: {subject}, 9:16.
