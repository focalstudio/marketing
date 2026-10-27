---
id: risograph
name: Risograph
status: demo
family: "Paper, paint & print"
engine: canvas
summary: "Two-ink risograph print: fluorescent pink and teal halftone dots on off-white paper, misregistered and grainy."
source: video/canvas/scenes/style_risograph.mjs
previews_from: canvas style_risograph 0.5,1.5,2.5
previews: 3
fonts: [Nunito]
used_in: []
palette:
  paper: "#f3efe4"
  pink: "#ff48b0"
  teal: "#00838a"
prompt: "Two-colour risograph print, only fluorescent pink and teal on off-white paper, halftone dot shading, the teal layer slightly misregistered, multiply overprint where inks overlap, ink grain. Subject: a pink rabbit sitting beside a big teal 25:00 timer on a teal dotted meadow under a pink dotted sky, 9:16."
---

## Look
Each ink is its own layer: solid shapes, halftone dots for tints, and paper knocked out where it should show. The teal layer is printed a few pixels off, so overlaps go dark and edges leave thin white gaps. Grain eats small holes in the ink.

## Do
- Use exactly two inks and let the paper be the third colour.
- Shade with halftone dots, never with gradients.
- Print layers with multiply and offset one of them.

## Don't
- No third colour, black or soft blur.
- No perfectly registered, perfectly clean fills.

## Prompt recipe
Two-colour risograph print, fluorescent pink and teal on off-white paper, halftone dots, slight misregistration, multiply overprint, ink grain. Subject: {subject}, 9:16.
