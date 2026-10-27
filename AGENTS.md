# AGENTS.md

Guidance for agents and humans working in `focalstudio/marketing`. [README.md](README.md) explains the pipeline;
this file is the short orientation. Deeper notes: [.claude/CLAUDE.md](.claude/CLAUDE.md).

## Before working
1. Run `git status -sb` and `git log --oneline -5`. Leave uncommitted work you didn't make alone.
2. Branch off `main` (`feat/*`, `fix/*`, `docs/*`, `chore/*`). Never commit to `main`; open a focused PR.
3. One issue per session. Anything else you find goes to [PARKING.md](PARKING.md), not into the diff.

## Map
- `queue/YYYY-Www/<slug>.md`: approved posts (frontmatter format in README). Merging to `main` is the approval.
- `published.json`: written by the publisher. Never hand-edit.
- `scripts/`: `publish.mjs` (check, plan, publish, refresh, buffer-posts, styles), `draft-week.mjs` (weekly drafter), `push-media.mjs`.
- `video/`: Python renderer (`kit/`, `styles/`, `clips/`, `tests/`). Goldens live in `video/tests/goldens/`. [video/STYLES.md](video/STYLES.md) lists the styles, [video/STORIES.md](video/STORIES.md) the stories.
- `video/canvas/`: canvas 2D scenes (`scenes/`), drawing kits (`toon.mjs`, `cel.mjs`, `ink.mjs`), sound (`audio.mjs`), `render.mjs`, one prompt `.md` per video. How a story opens and ends (the shared end card): [video/STORIES.md](video/STORIES.md). Goldens: none; `canvas.test.mjs` covers timing, sound and determinism. Making a video: load the [canvas-video skill](.claude/skills/canvas-video/SKILL.md) and start from `node video/canvas/new.mjs <name> --style <toon|cel|ink|kawaii>`.
- `apps/<app>.yml`: per-app config. `platforms.yml` + `PLATFORMS.md`: platform order. `voice.md`: tone. `GROWTH.md`: how the accounts grow and the human's routine.
- `.github/workflows/`: `ci` and `video-tests` (PRs), `publish` (on queue push + twice daily), `refresh-tokens`, `check`.

## Rules
- Posts go out to real accounts. Don't run `publish` without `--dry-run` locally; CI publishes.
- Secrets live in repo secrets only (see [SETUP.md](SETUP.md)). Never commit `.env`, tokens or API keys.
- Media is public once pushed to `focalstudio/media`. Check it before `push-media.mjs`.
- New videos get two approvals before a full render: a style sheet, then a keyframe sheet (see "Review gates" in [video/STORIES.md](video/STORIES.md)).
- Pin Pillow as in `video-tests.yml`: goldens only match with that wheel. Re-bless goldens deliberately, never to silence a failure.

## Validation
- `node --test scripts/*.test.mjs`
- `node scripts/publish.mjs plan`: validates every queued post offline (exits 1 on a bad one).
- `python3 -m unittest discover -s video/tests -t . -v` (needs Pillow and ffmpeg).

- `sh .claude/verify.sh` runs all of the above for the diff; focal-maintainer runs it before a PR or push. Per-area notes are in `.claude/verify/`.

## CHANGELOG
Add a line under `## Unreleased` in [CHANGELOG.md](CHANGELOG.md) for any user-visible change.
