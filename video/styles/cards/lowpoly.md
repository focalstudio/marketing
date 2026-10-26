---
id: lowpoly
name: Low poly
status: in-use
engine: pillow
summary: "Faceted 3D-ish animals lit like folded paper, the look of the app itself."
source: video/styles/lowpoly.py
previews_from: pillow meditate 1,4,8
previews: 3
fonts: [Nunito]
used_in: [meditate]
palette:
  ink: "#342c26"
  sage: "#4a7c59"
  cream: "#fff6e2"
  white: "#fffcf6"
prompt: "Low-poly origami look: every shape a small triangle mesh, flat-shaded facets with an upper-left light, no outlines, soft paper light. Subject: a white rabbit meditating on a flat rock in a golden-hour meadow with faceted mountains, 9:16."
---

## Look
Every shape is a small triangle mesh with a pseudo-3D height per vertex. Each facet is flat-shaded from its normal against a fixed upper-left light, with a little jitter per facet, so parts read as folded paper. No outlines.

## Do
- Keep facets visible, also on the sky and sun.
- Light from the upper left, always.
- Soft paper light and pastel greens and blues.

## Don't
- No outlines and no smooth gradients.
- No texture overlays: the facets are the texture.

## Prompt recipe
Low-poly origami look, flat-shaded facets lit from the upper left, no outlines, soft paper light. Subject: {subject}, 9:16.
