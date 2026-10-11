# Changelog

## Unreleased

- Docs: README describes the weekly autopilot as built, plus "Add an app" (the `apps/<app>.yml` keys and the workflow blocks a new app needs) and "What stays manual". SETUP step 6 lists the bot App's permissions and secrets, and why the workflow waits for checks and merges instead of `--auto`.
- Added `draft-week.yml`: Fridays 06:00 UTC (or `workflow_dispatch` with `dry_run`) Claude writes one new appart story from `.github/prompts/new-clip.md` (dropped if it fails to render or the tests fail), `draft-week.mjs` drafts next week, and the bot opens `chore: queue <week>` with each cover still. The PR merges itself once its checks pass, only from `trust_from` in `apps/<app>.yml`; `paused: true` is the kill switch (`scripts/queue-pr.mjs`).
- Added four appart-only story clips, `collect`, `phone_down`, `night_owls` and `rare_find` (10 units with their variants), with hooks and titles in `apps/wildfocus.yml` and one appart golden each.
- Added the `appart` video style: the app's own backdrop and animal PNGs (from `assets:` in `apps/<app>.yml`) instead of
  redrawn art. Storyboard motions: pop, hop, slide, bob, peek, freeze, shadows. Props: timer, phone (buzz), sky tint with
  stars, counter. `meditate` renders in it, with a golden.
- `video.kit.brand` reads `assets:` (`app_section`, `asset_path`, `cast_paths`).
- `video-tests` CI also renders `meditate --style appart` and uploads it as an artifact.
- Added `AGENTS.md`, `CLAUDE.md`, `.claude/`, `PARKING.md` and a proprietary `LICENSE`.
- Added `ci.yml`: runs the script tests and validates `queue/` (`publish.mjs plan`) on every PR, so queue-only PRs are checked.
