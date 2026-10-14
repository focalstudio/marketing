# weekly drafter and queue PR

- **Exists:** `scripts/draft-week.mjs` (drafts next week's posts), `scripts/queue-pr.mjs` (bot PR, self-merge from `trust_from`), `draft-week.yml`.
- **Drive:** `node --test scripts/draft-week.test.mjs scripts/queue-pr.test.mjs`; the workflow's `dry_run` input for the real thing.
- **Prove:** those tests green and `node scripts/publish.mjs plan` still exits 0 on the drafted queue.
- **Lies:** `paused: true` in `apps/<app>.yml` is the kill switch, a test that ignores it proves nothing. The human step is reading the drafted post text, not the pipeline.
