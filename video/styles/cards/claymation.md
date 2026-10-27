---
id: claymation
name: Claymation
status: demo
family: "Low poly & 3D"
engine: blender
summary: "Soft plasticine forms with fingerprint bumps, a warm key light and a stepped stop-motion pose."
source: video/blender/styles/claymation.py
previews_from: blender claymation 1,12,24
previews: 3
fonts: [Nunito]
used_in: []
palette:
  clay-rabbit: "#e8c2b2"
  clay-belly: "#f6e2d3"
  clay-pink: "#e9788f"
  clay-green: "#7dbb6a"
  clay-rock: "#8c9fb8"
  clay-yellow: "#f2c04d"
  clay-text: "#b4432d"
  wall: "#8fc1ea"
  table: "#e49a8d"
prompt: "Claymation still, soft plasticine with fingerprint bumps and slightly lumpy hand-squeezed shapes, matte skin with a hint of subsurface glow, warm key light from the upper left, stepped stop-motion pose, pastel blue wall and a pink table. Subject: a peach clay rabbit sitting on a green clay mound beside a grey-blue rock and a tiny plant, a yellow clay slab with red-brown 25:00 above, 9:16."
---

## Look
Everything is soft, rounded and a little uneven, with fine ridges like thumbprints on the surface. A warm key light from the left gives gentle shadows, and the pose changes in steps, not in smooth motion.

## Do
- Use matte colours with a little subsurface glow.
- Add low-frequency lumps so no shape is a perfect ellipsoid.
- Hold poses with constant interpolation.

## Don't
- No sharp edges, glossy highlights or clean gradients.
- No smooth in-betweens: the pose jumps.

## Prompt recipe
Claymation, soft plasticine, fingerprint bumps, lumpy shapes, matte, warm key light, stepped pose. Subject: {subject}, 9:16.
