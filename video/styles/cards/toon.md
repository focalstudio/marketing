---
id: toon
name: Toon
status: in-use
family: "Cartoon"
engine: pillow
summary: "Flat cartoon with thick dark outlines and big round shapes, after Gumball."
source: video/styles/toon.py
previews_from: pillow meditate 1,4,8
previews: 3
fonts: [Nunito]
used_in: [meditate]
palette:
  outline: "#422c26"
  ink: "#342c26"
  cream: "#fff6e2"
  white: "#fffcf6"
  sage: "#4a7c59"
  fur: "#86b4f4"
  fur-shade: "#fabac8"
  hoodie: "#ee7064"
  pants: "#7068b0"
prompt: "Flat cartoon, thick dark brown outlines, flat fills, big round shapes, no gradients. Subject: a blue rabbit in a red hoodie meditating on a rock in a sunny green meadow, 9:16."
---

## Look
Flat fills inside one thick dark outline, big round heads and bodies, cream and white highlights. Characters face right and move on gait cycles at 30 fps.

## Do
- Keep every shape closed and filled with one colour.
- Use the outline colour for text strokes too.
- Let characters squash on landing.

## Don't
- No gradients, textures or soft shadows.
- No thin lines: the outline stays the heaviest thing on screen.

## Prompt recipe
Flat cartoon, thick dark outlines, flat fills, big round shapes, no gradients. Subject: {subject}, 9:16.
