---
id: naturalist-engraving
name: Naturalist engraving
status: built
family: "Ink & engraving"
engine: canvas
summary: "Pen lines, hatching and washes on cream paper, like a field guide plate."
source: video/canvas/ink.mjs
previews_from: canvas rain_outside 0.6,14,25
previews: 3
fonts: [Nunito]
used_in: [rain_outside]
palette:
  paper: "#efe7d6"
  ink: "#2f2924"
prompt: "Naturalist engraving: fine ink pen lines and cross-hatching on cream paper, a ruler scale in the margin, lines that redraw slightly six times a second. Subject: a raindrop resting on a window pane above a quiet desk with books and a plant, 9:16."
---

## Look
Paper, pen lines, hatching and washes. Every random choice comes from a seeded generator, so a frame is a pure function of time. Lines boil six times a second, and a scale ruler names the size of what is on screen.

## Do
- Build tone with hatching, not fills.
- Add a caption and a ruler: the plate should read like a field guide.
- Follow one subject with the camera.

## Don't
- No saturated colour: washes stay faint.
- No smooth gradients.

## Prompt recipe
Naturalist engraving, ink pen lines and cross-hatching on cream paper, faint washes, scale ruler, lines that redraw slightly. Subject: {subject}, 9:16.
