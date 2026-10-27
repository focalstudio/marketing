# Video styles

One drawing kit per style in [styles/](styles/). Every style implements the contract in [styles/base.py](styles/base.py)
(scene kinds `title`, `world`, `end`, `text_line`, and the pose API). Which clips render in which style is set per clip
in [apps/wildfocus.yml](../apps/wildfocus.yml) (`styles:`), and how many posts each style gets a week by `mix:`.
`python3 -m video.render --list` prints what exists. Rule for the app's icon: always the real one, never redrawn.

**Gallery:** [docs/styles/index.html](../docs/styles/index.html) shows every style (stills, palette, fonts, an example prompt) from the
cards in [styles/cards/](styles/cards/); open it in a browser. A new style ships with a card (`<id>.md`, same fields as the others) and
three stills: `node scripts/gallery.mjs previews --only <id>`, then `node scripts/gallery.mjs build`. `node --test scripts/gallery.test.mjs`
fails if a card is incomplete or the page is stale. Fonts are in [fonts/fonts.json](fonts/fonts.json).

## In use

| Style | Engine | Look | Plays | Motion |
|---|---|---|---|---|
| `toon` | Pillow | flat cartoon, thick outlines, after Gumball | `meditate` | gait cycles, 30 fps |
| `lowpoly` | Pillow | faceted 3D-ish, soft paper light | `meditate` | gait cycles, 30 fps |
| `pixel` | Pillow | 8 px pixel art, fixed palette, Bayer dissolves | `meditate` | gait cycles, 30 fps |
| `ink` | Pillow | cream paper, pencil hatching, boiling ink outlines | `meditate` | outlines redrawn every 3 frames |
| `paper` | Pillow | layered cutout paper: torn sheets, soft shadows, parallax sway, pines | every story | 12 poses a second, stop-motion feel |
| `storybook` | Pillow | flat vector picture book, warm limited palette, paper grain over every frame | every story | 24 poses a second, smooth |

`paper` and `storybook` share [styles/_drawn.py](styles/_drawn.py) (the storyboard machinery of `appart`, with drawn art)
and the 22 animals in [kit/species.py](kit/species.py), so a story written once plays in both and the animals really
move: legs swing while they hop or walk, ears twitch, they blink, wings flap.

## Style library (demos)

IDs and decisions are in [docs/decisions/0001-style-library.md](../docs/decisions/0001-style-library.md). Every style below has a card
and three stills in the [gallery](../docs/styles/index.html), rendered from one demo (a rabbit beside a 25:00 timer). `demo` means the
look exists as a still-and-scene demo (`video/canvas/scenes/style_<id>.mjs` or `video/blender/styles/<id>.py`) but no video uses it yet.
Canvas 2D is the default engine (nothing to install); Blender is for real 3D, run as
`blender -b --factory-startup -P video/blender/render.py -- <id> <outdir> <frames>`.

| Family | Styles |
|---|---|
| Ink & engraving | `ink` (Pillow), `naturalist-engraving`, `wonderland-engraving`, `sumi-ink` |
| Kawaii & cute | `kawaii`, `kawaii-chibi`, `chibi-sparkle`, `sticker-sheet`, `mascot-flat` |
| Pixel & retro | `pixel` (Pillow), `pixel-art`, `gameboy`, `iso-pixel`, `crt-vhs` |
| Cartoon | `toon` (Pillow), `toon-cel`, `cartoon-hose`, `anime-cel` |
| Paper, paint & print | `paper`, `storybook` (Pillow), `watercolor`, `risograph`, `crayon` |
| Low poly & 3D | `lowpoly` (Pillow), `lowpoly-2d`, `lowpoly-3d`, `voxel`, `claymation`, `toon-3d`, `felt`, `diorama` (Blender) |

Cartoon styles keep clear of any studio's characters (`cartoon-hose` draws a cream, lop-eared rabbit on purpose).

## Retired

`appart` pasted the app's own static PNGs (backdrop and animals) onto the storyboards. Static images, not animation, and
not original art, so since 2026-10-23 it is out of the rotation (the renderer keeps it for posts already queued and for
the tests that cover the storyboard keys).

## First numbers (Buffer, 23 Oct 2026, one post each: a hint, not a result)

| Style | YouTube views | TikTok views | TikTok avg watch |
|---|---|---|---|
| pixel | 1012 | 239 | 1.6 s |
| toon | 486 | 249 | 2.4 s |
| lowpoly | 258 | n/a | n/a |
| appart | 158 | 257 | 2.5 s |

Read the live numbers with `gh workflow run check.yml -f command=styles` (read-only), about four weeks after a style
joined the mix. Decision rule: keep the top 2-3 styles, drop the rest, move `mix:` toward the winners.

## Shortlist (not built)

From the 2026 animation-style list, in the order we would try them:

1. **Claymation look**: soft rounded shading, slightly stepped motion. Cosy, but hard to fake in 2D; try after paper and storybook have data.
2. **Kinetic typography**: not a world style but a hook layer: animated text for the first 1-3 s of any style. Worth it if hold-through at 2 s stays low.
3. **Cel-shaded**: 2D cartoon with 3D depth; a cheap upgrade to `toon` if cartoon styles win.
4. **Mixed media**: paper animals on a storybook backdrop and the like; only once two styles have proven themselves.

Rejected, with the reason: stop motion, rotoscope, pixilation, live action with animation (need footage we don't shoot),
whiteboard and motion graphics (explainer styles, off-mood for a calm app), photoreal 3D (cost, and not the soft look),
anime (off-brand), sand (slow to read in a feed), vector animation (that is what `storybook` already is).

## Adding a style

- Easiest: subclass `_drawn.Style` and implement `build()` (backdrop layers), `stamp()` (how one polygon is drawn) and
  `tone()` (colour treatment). It then plays every story. See [styles/paper.py](styles/paper.py).
- Otherwise implement `base.Style` yourself; the pose API covers rabbit, fox, deer and hedgehog only.
- Add goldens for the new pairs only (`python3 -m video.tests.make_goldens --only <style>`, with Pillow pinned as in
  `video-tests.yml`) and look at `goldens/sheet.png` before committing.

Ideas for the drawn styles came from [awesome-opus-5-5-video-styles](https://github.com/HiAPIAI/awesome-opus-5-5-video-styles)
(CC BY 4.0, HiAPIAI). Nothing was copied from it: the code and art here are our own.
