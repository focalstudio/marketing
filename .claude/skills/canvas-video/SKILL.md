---
name: canvas-video
description: Read first to make, edit or render any WildFocus / Focal Studio marketing video: canvas 2D scenes (video/canvas/), their sound, review sheets and the shared end card. Holds the scene contract, the work loop with its two approval gates, and what to read for story, style and motion.
---

# Canvas video

A scene is JS that draws frame `t` on a canvas. `video/canvas/render.mjs` drives headless Chrome through every frame and pipes
the PNGs to ffmpeg. Structure adapted from HeyGen's Apache-2.0 [`/hyperframes`](https://github.com/heygen-com/hyperframes/blob/main/skills/hyperframes/SKILL.md) skill.

## Contract

A scene `video/canvas/scenes/<name>.mjs` exports:
- `DURATION` (s), `setup(doc, W, H, { icon, animals })` returning state, `draw(ctx, t, W, H, state)`. Optional: `COVER`, `ANIMALS`.
- `CAPTIONS` (first one `from: 0`, apart, inside the video), `SCENES` (overlapping, the last ends at `DURATION`), `END`, `BEATS`, `SOUND`.
- 30 fps, 1080×1920, scale everything by `k = W / 1080`. Fonts: Nunito is loaded; others in `video/fonts/fonts.json`.
- **Deterministic:** a frame is a pure function of `t`. Randomness only from `rng(seed)` in `ink.mjs`; no `Math.random`, `Date.now`,
  `performance.now` or `fetch`. `canvas.test.mjs` fails if one appears.
- **End card:** call `endCard(ctx, t, W, H, { icon, from: END.from, tile })` from `cel.mjs`, `END = { from, title: "WildFocus", lines: CLOSING, store: STORE }`,
  held at least 3 s, after the last caption. Never draw your own.
- **App icon:** always the real one (`icon` from `setup`), never redrawn.
- **Sound:** `SOUND.kind` picks the builder in `audio.mjs` (`rain`, `toon`, `city`, `intro`); set `SOUND.close = END.from` where the builder takes it.
  Full level from frame 0. `-silent.mp4` is the copy for adding a platform sound.

## Work loop

1. **Scope:** one video per session. Read `video/STORIES.md` (story and end rules) and `voice.md` (tone). `app` posts address consumers.
2. **Scaffold:** `node video/canvas/new.mjs <name> --style toon|cel|ink|kawaii` writes the scene, the style sheet and the prompt `<name>.md`. Edit those; do not start from a blank file.
3. **Gate 1, style sheet:** render `scenes/<name>_style.mjs` with `node video/canvas/render.mjs <name>_style --preview DIR 0`, Read that one PNG, show it, **stop and wait for approval**.
4. **Gate 2, keyframes:** `node video/canvas/render.mjs <name> --sheet OUT.png "t1,t2,..."` (labels come from `BEATS`), Read that one PNG, show it, **stop and wait for approval**.
5. **Render:** only after both approvals, `node video/canvas/render.mjs <name>` with `run_in_background` (slow). It writes `inbox/wildfocus/<name>.mp4`, `-silent.mp4` and `-cover.jpg`.
6. **Prove:** `node --test video/canvas/canvas.test.mjs`, add a timing test for the new scene as the existing ones do, then a CHANGELOG line.

Always on:
- Preserve the owner's edits made outside the conversation; ask before overwriting a surprising change.
- Do not render the full video unless both gates are approved or the owner asks for the file.
- Never commit rendered `.mp4` outside `inbox/`; never hand-edit `published.json`.

## Pro budget

- Look at contact sheets, never at single frames, and never Read an mp4 or a frame dump.
- Scene code on Sonnet; Opus only when designing a new style or story. `focal-maintainer:route` decides.
- Search before reading: kits are 100-400 lines, so Grep for the helper you need and Read with `offset`/`limit`.

## What to read

| Request | Read |
|---|---|
| New story, hook, caption copy, ending | [references/story.md](references/story.md) |
| Which look, which kit, a new style | [references/styles.md](references/styles.md) |
| Timing, easing, holds, impact frames, camera | [references/motion.md](references/motion.md) |
| Before asking for either approval | [references/review.md](references/review.md) |
| A real 3D look | `video/blender/` and `video/STYLES.md` (local only, no CI) |
