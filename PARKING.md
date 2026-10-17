# Parking lot

> Findings spotted mid-session and **deliberately not fixed there**. Append one line under `## Parked`:
> `- [ ] YYYY-MM-DD · found while on #N · path:line · what is wrong · suggested priority`
> Triage: file as an issue (label `parked`) or drop with a reason, then move to `## Triaged`.

## Parked

- [ ] 2026-10-17 · found while on docs/growth-guide · scripts/draft-week.mjs (`links("x")`) · X posts carry the app link in the main text, which X reportedly down-ranks; moving it to a self-reply needs thread support in publish.mjs · low

## Triaged

- [x] 2026-10-11 · found while on docs/autopilot · video/kit/brand.py:70 · `APP_REPO_DIR` is one directory for the whole job, so a second app's assets would resolve to the first app's checkout in CI; needs per-app directories · before adding app #2 · fixed 2026-10-11: `APPS_DIR/<repo name>` (`fix/per-app-repo-dir`)
