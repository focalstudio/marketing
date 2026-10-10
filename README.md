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
thumb: wildfocus/rabbit.png    # optional: Reels cover, Bluesky link-card image (Buffer ignores it)
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
20:07 UTC), and on demand (dry run by default). `check` proves the keys work. `check` with `refresh` reports token lifetimes; `refresh-tokens` renews the Threads and Instagram tokens every Monday.

## Video kit

Promo clips are drawn entirely in code: Python 3, Pillow and ffmpeg, with no other dependencies. Any clip can be rendered in any style.

```
python3 -m video.render meditate --style toon OUT.mp4
python3 -m video.render meditate --style pixel --preview /tmp/stills 1,6,12.5   # PNG stills at those seconds
python3 -m video.render --list                                                  # clips (with variants) and styles
python3 -m unittest discover -s video/tests -t .                                # goldens, audio, pose API, timeline
```

- [video/clips/](video/clips/) holds the storyboards: beats, timings, copy, chimes and positions, as plain data. Each one
  has a `.md` with the prompt behind it. A clip never imports a style. Small per-style tuning goes in its `OVERRIDES`.
- [video/styles/](video/styles/) holds one drawing kit per style (`toon`, `lowpoly`, `pixel`, `ink`). Each one implements
  the contract in [base.py](video/styles/base.py): the scene kinds `title`, `world` and `end`, `text_line`, and the
  shared pose API `rabbit / fox / deer / hedgehog`.
- [video/kit/](video/kit/) holds what everything shares: easing, the exact app icon and font (`brand`), the ffmpeg
  soundtrack (`audio`), and the timeline, camera, parallel render loop and ffmpeg pipe (`core`).

The app icon is read from `../WildFocus/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`. Set
`WILDFOCUS_REPO` to use a different checkout. Every style shows the icon exactly as it is, never redrawn.

**Add a clip.** Write `video/clips/<name>.py` with `BOARD = dict(dur=..., audio=None or dict(gust, chimes), scenes=[...])`
and `OVERRIDES = {}`. Each scene has a `name`, a `start` and a `kind`. Text times are scene-local. Copy the shape
of `meditate.py`, and add `<name>.md` with the prompt. If a style can't draw a feature the clip
uses, it raises `Unsupported`, and that's where the style needs work. Optional `VARIANTS = {name: {scene: patch}}`
gives the same story with another cast or copy (`--variant name`); each variant counts as its own post for the drafter.

**Add a style.** Write `video/styles/<name>.py` with a `Style(base.Style)` that implements the scene kinds it supports, plus
`text_line` and the pose API with the base signatures (`test_pose_api` checks them). Set `stateful = True` if frames
depend on earlier frames: they're then rendered in order, with `reset` and `advance`. Otherwise they render in parallel.

**Finals** go to `~/Desktop/FOCAL STUDIO/Focal_studio/media/final_videos/` and are published with
`node scripts/push-media.mjs`. Never commit an MP4 here. If you change a drawing on purpose, re-render that pair's goldens in
`video/tests/goldens/<clip>-<style>/` as lossless WebP and say so in the PR.

## Weekly drafting

```
node scripts/draft-week.mjs --dry-run   # what next week would get, and how many unused units are left
node scripts/draft-week.mjs             # render, push to focalstudio/media, write queue/<next week>/
```

A post's video is a **unit**: clip × style × variant (a clip's optional `VARIANTS`). The drafter never repeats a
unit until the pool is empty. It then reuses the oldest unit posted 8+ weeks ago, keeping its media and giving it
the clip's next hook. If even that falls short it drafts what it can and exits 3. Per-app cadence, posting days,
copy and styles live in `apps/<app>.yml`, and `paused: true` skips an app. For now it runs on the Mac (SF Rounded
and the WildFocus checkout); moving it to Actions is the next step.

## Status

Step 3 (publisher) built. Next: the first real test posts, one platform at a time.
