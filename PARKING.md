# Parking lot

> Findings spotted mid-session and **deliberately not fixed there**. Append one line under `## Parked`:
> `- [ ] YYYY-MM-DD · found while on #N · path:line · what is wrong · suggested priority`
> Triage: file as an issue (label `parked`) or drop with a reason, then move to `## Triaged`.

## Parked

- [ ] 2026-10-25 · found while on feat/canvas-last25 · video/canvas/render.mjs · two full renders of last25 can differ in frames 7.0-14.0 s (small edge differences; stills and audio are stable); probably Chrome canvas rasterisation · low
- [ ] 2026-10-24 · found while on docs/style-library · docs/decisions/0001-style-library.md · decision to move styles, fonts and palettes into a private `focalstudio/focal-styles` repo; first-week task list and WebGL/Blender spikes are in the doc · medium · status 2026-10-27: nothing has moved to a repo yet. #43 added the cards, `scripts/gallery.mjs`, `docs/styles/index.html` and `video/fonts/fonts.json`; #44 added a demo for every style (9 canvas `style_*.mjs`, 6 Blender), the families and the local Blender engine (`video/blender/`). Done here from the first-week list: task 3 (fonts), most of task 2 (the catalogue generator, no token validator or font lints) and the cartoon-hose demo from task 6. Still open: tasks 1, 4 and 5 (no repo, `check.mjs`, `core/`, brand tokens or v0.1.0 tag) and migration steps 3 and 5 (`ink.mjs` and `toon.mjs` still here, `apps/wildfocus.yml` still has `palette:`).
- [ ] 2026-10-27 · found while on docs/parking-triage · video/canvas/new.mjs:14-17 · the scaffold knows only toon, cel, ink and kawaii; the pixel kit (`pixel.mjs`) and paint kit have no `--style`, so pixel looks start from `cel` and swap the import · low
- [ ] 2026-10-23 · found while on feat/grow-clip-pool · video/tests/test_kit.py, video/styles/ink.py:25 · variants have no goldens (only the base cast renders), and `Image.effect_noise` in ink is unseeded.
- [ ] 2026-10-17 · found while on docs/growth-guide · scripts/draft-week.mjs (`links("x")`) · X posts carry the app link in the main text, which X reportedly down-ranks; moving it to a self-reply needs thread support in publish.mjs · low
- [ ] 2026-10-23 · found while on feat/style-experiment · video/styles/paper.py, storybook.py · the sun stays up as a dark disc once `night_owls` tints the sky to night; hide it behind the sky tint · low
- [ ] 2026-10-23 · found while on feat/style-experiment · video/kit/species.py · tiger, lynx, wolf and snow leopard share one quadruped plan and read as cats at a glance only; give them their own head and tail shapes if the stories do well · low
- [ ] 2026-10-23 · found while on feat/style-experiment · video/styles/appart.py `text_line` (and `_drawn.py`) · slow_lane's payoff text ("Take your time. / They'll wait.") rasterises about 1 px apart on Linux vs macOS with the same pinned Pillow, so its golden still moved to 10.3 s; find whether it is kerning or the fractional x of centred text · low

## Triaged

- [x] 2026-10-23 · found while on feat/grow-clip-pool · video/styles/pixel.py · pixel ports of the appart stories need new sprites and props · dropped 2026-10-27: obsolete, `apps/wildfocus.yml` sends clips that need a timer, phone or sky to the drawn styles and limits the story clips to `[paper, storybook]`, so no story needs a pixel port
- [x] 2026-10-23 · found while on feat/style-experiment · video/tests/goldens/ · paper and storybook goldens rendered on macOS might drift on the Linux CI wheel · dropped 2026-10-27: `video-tests` runs on ubuntu-latest and passed on main for #43, #44 and #45, so the goldens match there
- [x] 2026-10-11 · found while on docs/autopilot · video/kit/brand.py:70 · `APP_REPO_DIR` is one directory for the whole job, so a second app's assets would resolve to the first app's checkout in CI; needs per-app directories · before adding app #2 · fixed 2026-10-11: `APPS_DIR/<repo name>` (`fix/per-app-repo-dir`)
- [x] 2026-10-23 · found while on feat/grow-clip-pool · .github/workflows/draft-week.yml (`chore/queue-$WEEK`) · a top-up run in a week whose queue PR already merged edited the merged PR and opened none · fixed 2026-10-26: the step looks only at an open PR, by number (`fix/draft-week-branch`)
