# Review gates

Two images, each approved by the owner before the next step ("Review gates" in [video/STORIES.md](../../../../video/STORIES.md)). A look the owner
dislikes is cheapest to catch here, before a render.

## Gate 1: style sheet

One frame: characters in their poses, props, type, palette and any app art. Check before showing it:
- The real app icon where it appears, not a redraw. No series' characters or marks.
- Type readable at phone size, on the palette it will sit on.
- Every prop the story needs is on the sheet.

## Gate 2: keyframe sheet

One labelled still per beat, from `BEATS` (`t`, `word`, `say`). Check before showing it:
- Beat 1 is at `t <= 1` and shows the hook text.
- The premise is readable by the beat at about 3 s.
- Each caption in `CAPTIONS` has a beat; the last beat is on the end card.
- Nothing is cut off at the edges, and no two captions overlap in time.

State plainly what the sheet shows and what is not covered (motion and sound are not on a still). Then stop; do not render until approved.

## After the render

`node --test video/canvas/canvas.test.mjs`, then `-cover.jpg` is a good frame. Rendered files stay in `inbox/`.
