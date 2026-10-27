---
id: iso-pixel
name: Isometric pixel room
status: demo
family: "Pixel & retro"
engine: canvas
summary: "A cosy isometric pixel-art diorama on 2:1 tiles with a warm 20-colour palette."
source: video/canvas/scenes/style_iso_pixel.mjs
previews_from: canvas style_iso_pixel 0.5,1.5,2.5
previews: 3
fonts: []
used_in: []
palette:
  night: "#3a2838"
  wall-left: "#f4cfa8"
  wall-right: "#dc9a74"
  floor: "#d99c66"
  rug: "#d95f4c"
  desk: "#ecb97f"
  screen-text: "#ffd36b"
  leaf: "#78a85a"
  cream: "#fbe6c8"
  pink: "#f0a29a"
prompt: "Isometric pixel art, 2:1 pixel tiles, no dithering, about 20 warm colours, nearest-neighbour upscale, flat shaded faces (light top, mid left, dark right). Subject: a small cosy room diorama with striped walls, a sunny window, a shelf and a framed picture, a desk with a big amber 25:00 timer on its monitor, a red rug, a potted plant, and a cream rabbit with pink ears sitting on a cushion, floating in a plum night sky with a crescent moon, 9:16."
---

## Look
A 135x240 canvas scaled x8. Floor, walls and furniture are 2:1 isometric faces: lit top, mid left face, dark right face. Walls carry half-tile stripes; text on a wall is sheared at the same 2:1 slope. Only the rabbit gets an outline.

## Do
- Project everything through one grid-to-pixel function so all faces share the 2:1 slope.
- Shear any wall text by one pixel per two columns.
- Keep the palette to about twenty warm colours and a plum backdrop.

## Don't
- No dithering or gradients on faces.
- No perspective tricks: the camera never changes angle.

## Prompt recipe
Isometric pixel art, 2:1 tiles, no dithering, about 20 warm colours, nearest-neighbour upscale, light top and dark right faces. Subject: {subject}, 9:16.
