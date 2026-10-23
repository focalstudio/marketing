# Parking lot

> Findings spotted mid-session and **deliberately not fixed there**. Append one line under `## Parked`:
> `- [ ] YYYY-MM-DD · found while on #N · path:line · what is wrong · suggested priority`
> Triage: file as an issue (label `parked`) or drop with a reason, then move to `## Triaged`.

## Parked

- [ ] 2026-10-23 · found while on feat/grow-clip-pool · .github/workflows/draft-week.yml (`chore/queue-$WEEK`) · the branch name is reused, so a top-up run in a week whose queue PR already merged edits the merged PR and opens none (#28 had to be opened by hand); use a unique branch name or open the PR when the old one is merged.
- [ ] 2026-10-23 · found while on feat/grow-clip-pool · video/styles/pixel.py · pixel ports of the appart stories need new sprites and props (it draws only rabbit, fox, deer and hedgehog, with no timer, phone, sky or pop/peek/slide motion); wait for the style metrics before investing.
- [ ] 2026-10-23 · found while on feat/grow-clip-pool · video/tests/test_kit.py, video/styles/ink.py:25 · variants have no goldens (only the base cast renders), and `Image.effect_noise` in ink is unseeded.
- [ ] 2026-10-17 · found while on docs/growth-guide · scripts/draft-week.mjs (`links("x")`) · X posts carry the app link in the main text, which X reportedly down-ranks; moving it to a self-reply needs thread support in publish.mjs · low

## Triaged

- [x] 2026-10-11 · found while on docs/autopilot · video/kit/brand.py:70 · `APP_REPO_DIR` is one directory for the whole job, so a second app's assets would resolve to the first app's checkout in CI; needs per-app directories · before adding app #2 · fixed 2026-10-11: `APPS_DIR/<repo name>` (`fix/per-app-repo-dir`)
