# publish and the queue

- **Exists:** `scripts/publish.mjs` (check, plan, publish, refresh), `queue/YYYY-Www/*.md`, `published.json`.
- **Drive:** `node scripts/publish.mjs plan` validates every queued post offline; `publish --dry-run` shows what would go out.
- **Prove:** `node --test scripts/publish.test.mjs scripts/push-media.test.mjs`, then `plan` exits 0.
- **Lies:** never run `publish` without `--dry-run` locally, it posts to real accounts. `published.json` is written by the publisher only.
