---
id: wonderland-engraving
name: Wonderland engraving
status: planned
engine: canvas
summary: "Victorian wood-engraving hatching on flat shapes, in the manner of Tenniel."
previews: 0
fonts: [IM Fell DW Pica]
used_in: []
palette:
  paper: "#efe7d6"
  ink: "#2f2924"
prompt: "Victorian wood engraving: dense parallel and cross hatching on flat black-and-cream shapes, fine ruled border, Fell-type caption beneath. Subject: a rabbit in a waistcoat checking a large pocket watch, 9:16."
---

## Look
Hatching on flat shapes with a ruled border and a serif caption. Reuses the pen, hatch and boil helpers in `video/canvas/ink.mjs`.

## Do
- Model form with line density only.

## Don't
- No colour and no copy of any specific illustrator's characters.

## Prompt recipe
Victorian wood engraving, dense hatching on flat shapes, ruled border, serif caption. Subject: {subject}, 9:16.
