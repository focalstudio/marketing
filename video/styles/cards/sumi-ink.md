---
id: sumi-ink
name: Sumi ink
status: demo
family: "Ink & engraving"
engine: canvas
summary: "Japanese brush ink: tapered strokes, soft grey washes, lots of empty paper and one small red seal."
source: video/canvas/scenes/style_sumi-ink.mjs
previews_from: canvas style_sumi-ink 0.5,1.5,2.5
previews: 3
fonts: [Nunito]
used_in: []
palette:
  paper: "#f1ece0"
  ink: "#1d1b19"
  wash: "#8a8478"
  wash-deep: "#5e5a52"
  mist: "#a8a395"
  seal: "#c8372d"
prompt: "Sumi-e brush ink on warm paper, portrait 9:16: tapered black strokes that swell and thin with dry-brush streaks at the tail, pale grey washes with soft feathered edges and a darker crescent on the shaded side, faint misty mountains, more than half the frame left empty, one small red seal in the lower right corner, light thin Nunito lettering. Subject: a rabbit sitting in profile at the lower left, a large open brush circle (enso) at the upper right with the time 25:00 written inside it and MINUTES beneath, caption twenty-five minutes."
---

## Look
Strokes are filled polygons with a pressed start, a swelling body and a lifted tail, so no line has an even width. Washes are blurred fills with soft edges, a darker crescent away from the light. The timer is an open circle that closes a little more each second, with thin Nunito digits inside. One red seal.

## Do
- Leave at least half the frame as paper.
- Let the ink bleed: blur a faint copy under written digits.

## Don't
- No outlines of even width and no hard-edged fills.
- No more than one red mark.

## Prompt recipe
Sumi-e brush ink, tapered strokes, grey washes with soft edges, empty paper, one small red seal. Subject: {subject}, 9:16.
