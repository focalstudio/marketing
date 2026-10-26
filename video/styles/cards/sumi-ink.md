---
id: sumi-ink
name: Sumi ink
status: planned
engine: canvas
summary: "Brush ink with a tapered stroke, washes of grey and one red seal."
previews: 0
fonts: [Nunito]
used_in: []
palette:
  paper: "#f1ece0"
  ink: "#1d1b19"
  wash: "#8a8478"
  seal: "#c8372d"
prompt: "Sumi-e brush ink: tapered black strokes, grey ink washes with soft edges, lots of empty paper, one small red seal in a corner. Subject: a rabbit sitting under a pine in morning mist, 9:16."
---

## Look
Strokes drawn as filled tapered polygons (as in `video/canvas/cel.mjs`), washes with feathered edges and generous empty space.

## Do
- Leave at least half the frame as paper.

## Don't
- No outlines of even width: every stroke swells and thins.

## Prompt recipe
Sumi-e brush ink, tapered strokes, grey washes, empty paper, one red seal. Subject: {subject}, 9:16.
