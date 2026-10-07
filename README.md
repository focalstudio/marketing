# marketing

Focal Studio's marketing pipeline. Posts are drafted from what already happens in git
(merged PRs, releases, roadmap progress) and from each app's own artwork. A human approves
them in a weekly PR, and they publish automatically.

- [PLATFORMS.md](PLATFORMS.md): where we post and why, in tier order.
- [platforms.yml](platforms.yml): the same order, read by the publisher.
- [voice.md](voice.md): how posts should sound.
- [apps/](apps/): one config per app for the app stream (concept, assets, music, links).
- `queue/`: approved posts waiting to publish, one file per post.
- `inbox/<app>/`: drop hand-made clips here (Veo, Sora); the pipeline captions and posts them.
- [focal-kit-plan.html](focal-kit-plan.html): the Focal Kit business plan.

## Status

Step 1 of 6 done (repo + config). Next: accounts and secrets (Buffer for X, YouTube and
TikTok; a Bluesky app password; a Meta app for Threads and Instagram; a dev.to key; an R2
bucket), then `publish.mjs`.
