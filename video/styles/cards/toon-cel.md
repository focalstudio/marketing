---
id: toon-cel
name: Toon cel
status: demo
family: "Cartoon"
engine: canvas
summary: "The toon look with cel shading: a 2D cartoon with 3D depth from one hard shadow band and one highlight per shape."
source: video/canvas/scenes/style_toon-cel.mjs
previews_from: canvas style_toon-cel 0.5,1.5,2.5
previews: 3
fonts: [Nunito]
used_in: []
palette:
  outline: "#422c26"
  cream: "#fff6e2"
  sky: "#c4e6fa"
  sun: "#ffd45e"
  grass: "#8fcb73"
  hill: "#78b88b"
  fur: "#86b4f4"
  ear-inner: "#fabac8"
  coral: "#ee7064"
  butter: "#ffc94d"
prompt: "Cel-shaded cartoon, portrait 9:16: thick dark brown outline, flat fills, big round shapes, every shape with exactly one hard-edged shadow band on its lower right (the fill mixed 26 percent with deep purple) and one small flat highlight on its upper left, light from a sun in the top left corner, no gradients or soft shading, bold Nunito title with a thick outline. Subject: a blue rabbit with pink inner ears sitting on a green meadow beside a big coral kitchen timer with a cream display reading 25:00, rolling hills and clouds behind, title Time to focus!"
---

## Look
The sticker look of `toon`: round shapes inside one thick warm-brown outline, flat fills. Each shape adds a single hard shadow band on the lower right and a single flat highlight on the upper left; the sun sits in the upper left corner so every shadow agrees, and cast shadows fall to the right.

## Do
- Keep one light direction across the whole frame.
- Make the shadow band the fill mixed with a deep cool purple, never black.

## Don't
- No soft shading, gradients or second shadow bands.
- Keep the outline the heaviest line on screen.

## Prompt recipe
Cel-shaded cartoon, thick outline, flat fills, one hard shadow band and one highlight per shape, light from the upper left. Subject: {subject}, 9:16.
