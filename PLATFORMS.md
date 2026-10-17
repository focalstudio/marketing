# Platform tier list

Where Focal Studio markets, ranked for selling a dev tool (Focal Kit) to Expo and Claude Code
builders. Checked 2026-10-07.

**The rule:** we only post where posting is automatic and free. A platform that fails
either test stays on this list so the decision is visible, but the pipeline never posts to it.

| Tier | Platform | Why | Auto + free? | Route |
|---|---|---|---|---|
| S | X | Home of Claude Code and build-in-public; indie RN/Expo buyers | ✅ | Buffer |
| S | YouTube Shorts | Reach, plus long-lived search | ✅ | Buffer |
| S | Reddit | Highest buyer intent | ❌ API closed | not posted |
| A | Bluesky | Dense React / RN dev community | ✅ | direct API |
| A | Blog + dev.to | Compounding SEO from issues already solved | ✅ | dev.to API |
| A | Show HN / Product Hunt | One big launch day each | ❌ | not posted |
| B | TikTok | Huge reach; strongest fit for the app stream | ✅ | Buffer (notify: you finish each post in the app) |
| B | Threads | Weak dev audience, decent consumer one, free | ✅ | direct API |
| B | Indie Hackers / Expo Discord | Conversations, not broadcasting | ❌ | not posted |
| C | Instagram Reels | Reuses the app shorts at zero extra cost | ✅ | direct Graph API |
| C | LinkedIn | Dropped: too corporate for this audience | — | not posted |

## Posting order

Tier-sorted, auto + free only. [`platforms.yml`](platforms.yml) is the machine-readable copy
that the publisher reads, so change both together.

1. X — Buffer
2. YouTube Shorts — Buffer
3. Bluesky — direct
4. dev.to — direct (articles only)
5. TikTok — Buffer
6. Threads — direct
7. Instagram Reels — direct

Buffer's free plan gives 3 channels: **X, YouTube, TikTok**. Those three are the ones whose
direct APIs cost money (X) or post privately until the app passes an audit (YouTube,
TikTok). Bluesky, Threads and Instagram are free to post to directly, so they don't use a
Buffer slot.

## Streams

One set of Focal Studio accounts carries both streams.

- **Kit** (developers): X, Bluesky, dev.to, Threads.
- **App** (consumers): YouTube Shorts, TikTok, Instagram Reels, Threads. Also X and Bluesky,
  with a "built with Claude Code" caption.

## Why each ❌ is a ❌

- **X direct API**: the free tier closed to new projects in Feb 2026. Posts cost about
  $0.015, or $0.20 with a link. Buffer absorbs this, which is why X is ✅ via Buffer.
- **Reddit**: self-serve API access closed in Nov 2025 (Responsible Builder Policy), and
  personal scripts don't qualify. Subreddit self-promo rules would get a bot banned anyway.
- **TikTok / YouTube direct**: an unaudited app can only post private videos. Buffer is
  audited, so its posts go out public.
- **Show HN, Product Hunt, Indie Hackers, Discord**: no posting API, or one that would
  break community rules.
- **LinkedIn**: free to auto-post (self-serve `w_member_social`), dropped by choice.
  Revisit if buyers turn out to be agencies or freelancers.

Re-check these facts every quarter. API pricing in this space moves fast.
