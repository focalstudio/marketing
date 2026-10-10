# marketing

Focal Studio's marketing pipeline. Posts are drafted from what already happens in git
(merged PRs, releases, roadmap progress) and from each app's own artwork. A human approves
them in a weekly PR, and they publish automatically.

- [PLATFORMS.md](PLATFORMS.md): where we post and why, in tier order.
- [platforms.yml](platforms.yml): the same order, read by the publisher.
- [voice.md](voice.md): how posts should sound.
- [apps/](apps/): one config per app for the app stream (concept, assets, music, links).
- `queue/`: approved posts waiting to publish, one file per post (format below).
- `published.json`: what has been posted, written by the publisher. Don't hand-edit.
- `inbox/<app>/`: drop hand-made clips here (Veo, Sora); the pipeline captions and posts them.
- [SETUP.md](SETUP.md): accounts, keys and secrets to create before the first post.
- [focal-kit-plan.html](focal-kit-plan.html): the Focal Kit business plan.

## Queue format

One file per post: `queue/YYYY-Www/<slug>.md`, with YAML frontmatter and the post text as the body.

```markdown
---
stream: kit                    # kit (developers) or app (consumers)
platforms: [x, bluesky, threads]
at: 2026-10-12T09:00:00Z       # ISO 8601, UTC
media: wildfocus/rabbit.mp4    # optional: a path in focalstudio/media, or an https URL (push with scripts/push-media.mjs)
thumb: wildfocus/rabbit.png    # optional: video thumbnail, Reels cover, Bluesky link-card image
title: Rabbit focus            # YouTube, TikTok and dev.to; Bluesky card title
ai: true                       # sets the platform's "AI-generated" flag (X, YouTube, TikTok)
article: false                 # true for a dev.to article; the body is then the article
tags: [expo, claude]           # dev.to only, at most 4
draft: false                   # true: validated, never posted
---
Default text for every platform.

<!-- bluesky -->
Optional: Bluesky gets this instead.
```

- Only platforms in `platforms.yml` without `enabled: false`, and only the post's stream.
- Limits are checked before anything is sent: X 280 (links count 23), Bluesky 300 graphemes,
  Threads 500, YouTube title 100.
- Links get `utm_source=<platform>&utm_medium=social&utm_campaign=<week>`.
- **When it posts.** Buffer (X, YouTube, TikTok) is scheduled once `at` is within 7 days,
  at most 10 queued per channel, and Buffer posts it at the exact time. Direct platforms
  (Bluesky, dev.to, Threads, Instagram) post on the push run if `at` is within 15 min;
  otherwise on the next fallback run at 08:07 or 20:07 UTC, so up to ~12 h late. For an
  exact time days ahead, use a Buffer platform or push near the time.
  Anything more than 48 h overdue is reported as stale, not posted.
- Each post that goes out is added to `published.json`, and a re-run skips it.

```
node scripts/publish.mjs plan                # what is due; no secrets needed
node scripts/publish.mjs publish --dry-run   # print every request, secrets as ***
node scripts/publish.mjs publish --dry-run --drafts  # also preview drafts
node --test scripts/*.test.mjs
```

In Actions, `publish` runs on every push to `queue/`, twice a day as a fallback (08:07 and
20:07 UTC), and on demand (dry run by default). `check` proves the keys work. `check` with `refresh` reports token lifetimes.

## Status

Step 3 (publisher) built. Next: the first real test posts, one platform at a time.
