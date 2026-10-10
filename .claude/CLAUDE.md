# CLAUDE.md

Read [AGENTS.md](../AGENTS.md) first; it has the map, rules and validation commands.

## Conventions
- Commits: `type(scope): what changed` (`feat`, `fix`, `docs`, `chore`, `test`). One logical change per commit.
- PRs go to `main`, one issue each. The weekly drafted-posts PR is the human approval step: review the text, don't rewrite the pipeline in it.
- Stream `kit` posts address developers; `app` posts address consumers. Follow `voice.md`.
- Match the surrounding code: plain Node ESM (no dependencies) for `scripts/`, stdlib + Pillow for `video/`.

## Never
- Hand-edit `published.json` or commit rendered `.mp4` outside `inbox/` (see `.gitignore`).
- Print or log secret values, including in test fixtures.
