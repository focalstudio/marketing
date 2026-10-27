# Styles and kits

The style list and engines are in [video/STYLES.md](../../../../video/STYLES.md); decisions in `docs/decisions/0001-style-library.md`. Canvas 2D is the default engine.

| Look | Kit | Reference scene |
|---|---|---|
| Naturalist engraving, pen and wash | `ink.mjs` (`pen`, `hatch`, `wash`, `paperGrain`, `caption`) | `rain_outside` |
| Kawaii chibi, flat colour, lesson-style UI | `toon.mjs` (`critter`, `heading`, `button`, `progressBar`, `squash`, `hop`) | `focus_rabbit` |
| Anime cel, hard shadow, grain, impact flash | `cel.mjs` (`cel`, `watch`, `speedLines`, `letterbox`, `invert`, `grain`) | `last25` |
| Kawaii flat bunnies and props | `kawaii.mjs` (`bunny`, `keyword`, `rarityCard`, `timerRing`) | `studio_intro` |

- Shared helpers (`rng`, `prog`, `easeOut`, `easeIo`, `lerp`) are in `ink.mjs`. `endCard`, `CLOSING`, `STORE` are in `cel.mjs`.
- Grep for the helper you need; do not Read a whole kit.
- A new style ships with a card and three stills (see `video/STYLES.md`) and needs the owner's approval of its style sheet.
- Real 3D (voxel, claymation, felt, diorama) is Blender, local only: not available on `ubuntu-latest`, so no CI job renders it.
- Pillow styles (`paper`, `storybook`, ...) are the other renderer (`python3 -m video.render`); do not mix them into a canvas scene.
