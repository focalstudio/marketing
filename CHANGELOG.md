# Changelog

## Unreleased

- Added the `appart` video style: the app's own backdrop and animal PNGs (from `assets:` in `apps/<app>.yml`) instead of
  redrawn art. Storyboard motions: pop, hop, slide, bob, peek, freeze, shadows. Props: timer, phone (buzz), sky tint with
  stars, counter. `meditate` renders in it, with a golden.
- `video.kit.brand` reads `assets:` (`app_section`, `asset_path`, `cast_paths`).
- `video-tests` CI also renders `meditate --style appart` and uploads it as an artifact.
- Added `AGENTS.md`, `CLAUDE.md`, `.claude/`, `PARKING.md` and a proprietary `LICENSE`.
- Added `ci.yml`: runs the script tests and validates `queue/` (`publish.mjs plan`) on every PR, so queue-only PRs are checked.
