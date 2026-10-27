---
id: ink
name: Ink
status: in-use
family: "Ink & engraving"
engine: pillow
summary: "Cream paper, pencil hatching and wobbly outlines that boil like hand-drawn animation."
source: video/styles/ink.py
previews_from: pillow meditate 1,4,8
previews: 3
fonts: [Nunito]
used_in: [meditate]
palette:
  paper: "#f3efe2"
  ink: "#342c26"
  sage: "#4a7c59"
  sun: "#eea840"
prompt: "Hand-drawn ink on cream paper, pencil hatching, wobbly black-brown outlines, a sketched sun with rays, faint diagonal pencil strokes in the paper. Subject: a rabbit meditating on a rock beside a small pond, pines behind, 9:16."
---

## Look
Shapes are drawn with a pen in 0..100 units and every vertex wobbles per seed. Several variants of each sprite are cycled every third frame so the outlines boil. The sun is the only warm colour.

## Do
- Hatch shadows with parallel pencil strokes.
- Let lines overshoot and wobble a little.
- Keep paper visible everywhere.

## Don't
- No flat fills of colour except the sun and a sage wash.
- No clean vector edges.

## Prompt recipe
Hand-drawn ink on cream paper, pencil hatching, wobbly outlines that redraw every few frames, one warm sun. Subject: {subject}, 9:16.
