# Motion

Habits taken from `cel.mjs`, `toon.mjs` and `ink.mjs`. Adapted from HyperFrames' `motion.md` and `types/character.md`.

- **Progress, not time:** `prog(t, from, to)` gives 0..1, then shape it: `easeOut` for arrivals, `easeIo` for camera moves and sweeps. Linear only for clocks.
- **Overshoot for life:** `easeBack` in `toon.mjs` for pops and button presses; `squash(v)` keeps area, so a landing squashes and a jump stretches.
- **Hops:** `hop(t, at, dur, height)` returns `{ y, v }`; pass `v` to `critter` so the body squashes. Give each hop a sound at `at + 0.15`.
- **Blinks:** `blinkTimes(seed)` and `blink(t, times)`: seeded, uneven and brief. Never on a metronome.
- **Camera:** a slow push on the whole frame (`1 + 0.08 * prog(t, 0, 14)`) keeps a still shot alive; hard cuts between scenes, overlapping `SCENES` so no frame is empty.
- **Impact:** two frames (`FLASH = [210, 211]` in `last25`), `invert(ctx, W, H)`, speed lines and one big word, with the sound cutting out at once.
- **Holds:** let a beat rest for 1-2 s before the next; captions fade in over 0.15 s and out over 0.2 s.
- **Boil:** hand-drawn looks redraw outlines every few frames (`boil(t, seed)` in `ink.mjs`), still seeded.
- **Grain:** `grain(ctx, t, W, H, tile)` last, before the end card (the card adds its own).
