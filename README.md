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
- The "AI-generated" flag is always sent as false (the videos are code-rendered); there is no `ai:` field.
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
- [video/styles/](video/styles/) holds one drawing kit per style (`toon`, `lowpoly`, `pixel`, `ink`, `appart`). Each one implements
  the contract in [base.py](video/styles/base.py): the scene kinds `title`, `world` and `end`, `text_line`, and the
  shared pose API `rabbit / fox / deer / hedgehog`.
- [video/kit/](video/kit/) holds what everything shares: easing, the exact app icon and font (`brand`), the ffmpeg
  soundtrack (`audio`), and the timeline, camera, parallel render loop and ffmpeg pipe (`core`).

The app icon and art are read from the app's repo checkout, by default `../<repo name>` beside this one (`../WildFocus`),
at the `icon:` and `assets:` paths in `apps/<app>.yml`. Set `APPS_DIR` to a folder holding one checkout per app (`<APPS_DIR>/<repo name>`, as CI does), or `APP_REPO_DIR`
(`WILDFOCUS_REPO` also works) to point every app at one checkout. Every style shows the icon exactly as it is, never redrawn.

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
copy and styles live in `apps/<app>.yml`.

**The autopilot** is [`.github/workflows/draft-week.yml`](.github/workflows/draft-week.yml): Fridays 06:00 UTC, or on
demand with `gh workflow run draft-week.yml` (a manual run is a dry run unless you set `dry_run` to false: it lists the
picks, renders nothing and opens no PR).

1. **New story.** Claude follows [`.github/prompts/new-clip.md`](.github/prompts/new-clip.md) and writes one new appart
   clip per active app. It may only add `video/clips/<name>.py` and `.md` and the `clips:` entry in `apps/<app>.yml`.
   If it touches anything else, the clip doesn't render, or the tests fail with it, the story is dropped. A failed
   story never blocks the week; the existing pool carries on.
2. **Draft.** `draft-week.mjs` renders next week's posts, pushes the finals to `focalstudio/media` and writes
   `queue/<week>/`. `publish.mjs plan` validates the queue.
3. **PR.** The bot opens (or updates) `chore: queue <week>` from `chore/queue-<week>`. The body has each post's cover
   still, title and slot, plus the new story's prompt ([scripts/queue-pr.mjs](scripts/queue-pr.mjs) `body`).
4. **Merge.** `queue-pr.mjs gate` allows an auto-merge only when every app that isn't `paused: true` has a
   `trust_from` date on or before today (UTC); a missing or malformed date counts as not trusted. If it passes, the job
   waits for the PR's own checks (`ci`, `video-tests`) and squash-merges. The merge triggers `publish.yml`. Before
   `trust_from` (or when an app has none) the PR stays open and **merging it by hand is the approval**.

`paused: true` in an app's yml is the kill switch: nothing is drafted for that app and nothing auto-merges. To stop a
week already queued, close the PR or set `draft: true` in the posts.

## Add an app

About 30 minutes, most of it the app's own art. Copy [apps/wildfocus.yml](apps/wildfocus.yml) to `apps/<app>.yml`
and set:

| Key | Meaning |
|---|---|
| `repo`, `ref` | the app's GitHub repo and the branch to read art from |
| `icon` | path of the app icon inside `repo`; the end card shows it unchanged |
| `assets` | `backdrop` (portrait PNG), `cast` (glob of transparent animal PNGs), `hero` |
| `concept`, `mood` | what the new-story prompt writes from |
| `cadence` | `N per week` |
| `days`, `time` | posting days and time, UTC |
| `styles` | styles the app's clips render in |
| `clips` | per clip, `hooks[i]` paired with `titles[i]`; optional `styles` limits a clip |
| `trust_from` | optional, `YYYY-MM-DD`: the PR auto-merges from here; without it the PR waits for a manual merge |
| `paused` | `true` is the kill switch |

`caption_cta`, `links` and `ai_label` fill the post text, store links and the AI-generated flag.

Then give CI the app's art: add a sparse-checkout block (its `repo`, `ref`, `icon` and asset paths) to **both**
[draft-week.yml](.github/workflows/draft-week.yml) and [video-tests.yml](.github/workflows/video-tests.yml), add the
repo to the bot token's `repositories:` in `draft-week.yml`, and give the bot App read access to it
([SETUP.md](SETUP.md) step 6). CI sets `APPS_DIR` to `.apps`, so check each app out at `.apps/<repo name>`.

## What stays manual

- **Weekly:** review the `chore: queue <week>` PR (delete the files of posts you don't want, then merge). With a
  `trust_from` date this stops after that date, unless the run goes red or exits 3.
- **Every 60 days:** the Threads and Instagram tokens, which `refresh-tokens.yml` renews; act only if it goes red.
- **Per new app:** about 30 minutes for the yml and workflow blocks above.

Later, not built: a views feedback loop, where weekly views per post steer the drafter toward what did well.

## Status

Publisher and weekly autopilot are built. WildFocus has no `trust_from`, so each weekly PR is merged by hand.
