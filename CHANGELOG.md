# Changelog

## Unreleased

- Added the `paper` (layered cutout paper, 12 poses a second) and `storybook` (flat vector picture book, 24 a second) video styles. Both draw everything in code from a shared species table (`video/kit/species.py`, 22 animals that walk, twitch, blink and flap) on top of the `appart` storyboard machinery, so all seven story clips play in them, with goldens for the new clip x style pairs. `appart` (the app's static PNGs) leaves the rotation; queued posts keep their media. New `video/STYLES.md` (styles, first numbers, shortlist) and `video/STORIES.md` (stories and ideas).
- Added `mix:` to `apps/<app>.yml`: minimum posts per style per week, filled first by `draft-week` (WildFocus: 2 pixel, 2 paper, 2 storybook; pixel can only fill its minimum from `meditate`, so the drafter warns until it has more clips). `make_goldens --only STYLE` re-renders one style's goldens.
- Added `publish.mjs styles` (also a `check.yml` choice): Buffer views, watch time and reactions grouped by video style and clip. Read-only.
- WildFocus titles now lead with the phrase people search for and stay under 100 characters (tested); `GROWTH.md` gains "Shorts: what we optimise for".
- Fixed: `draft-week` no longer dies when a unit's media is already in `focalstudio/media` (renders are never byte-identical, so `push-media` refused the re-render). It uses the existing mp4 and png and renders nothing; renders also seed their noise from the unit. New `rest_weeks` in `apps/<app>.yml` (default 8; WildFocus 4) sets how soon a unit may be reused, and `draft-week --dry-run --weeks N` plans N weeks to show where the pool runs dry.
- WildFocus pool grown from 18 to 30 units (#26): 12 new appart variants on `night_owls`, `slow_lane`, `stay_awhile`, `short_break`, `rare_find`, `phone_down` and `collect`, and a third hook and title for every clip (hooks no longer name an animal a variant swaps out). A bare `<clip>-<style>` queue file counts as the clip's `meadow` variant.
- Added `.claude/verify.sh` and `.claude/verify/*.md`: the repo's offline proof (script tests, queue plan, and the video tests when `video/` or `apps/` changed), run by focal-maintainer before `gh pr create` and `git push`. `ci.yml` prints test coverage.
- Removed the `ai:` frontmatter field. Buffer always gets `isAiGenerated: false` for X, YouTube and TikTok (the videos are code-rendered, not generative AI); an `ai:` line in a post is now an unknown-field error.
- TikTok posts go to Buffer in `notification` mode (`notify: true` on the platform in `platforms.yml`): a phone alert at post time, finished in the TikTok app so a trending sound can be added. X and YouTube stay automatic. `published.json` still records TikTok as `scheduled`; `buffer-posts` shows the real status.
- WildFocus: removed `trust_from`, so the weekly PR waits for a manual merge (the approval), and raised the cadence to 7 per week (every day, 20:00 UTC).
- Added `GROWTH.md`: how TikTok, YouTube Shorts and X rank posts in 2026 (platform statements apart from reported patterns), the low-touch weekly routine, and why we skip warm-up filler and follow-for-follow.
- Fixed: CI no longer pins every app to one checkout. `video.kit.brand` resolves an app's repo at `APPS_DIR/<repo name>` (CI sets `APPS_DIR=.apps`), so a second app only needs its own checkout step. `APP_REPO_DIR` still overrides for a single local checkout.
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
