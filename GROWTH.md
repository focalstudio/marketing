# Growth guide: TikTok, YouTube Shorts, X

How to get reach for the WildFocus accounts with almost no time on social media. The pipeline makes and posts the
videos; the human approves the weekly PR, finishes each TikTok in the app, and replies to comments on our own posts.
Nothing here needs browsing feeds or commenting on other people's posts.

Each claim is tagged **[platform]** (the platform has said it) or **[reported]** (creator-tool blogs and observation;
treat the numbers as rough). Re-check every quarter, like [PLATFORMS.md](PLATFORMS.md).

## How ranking works now (2026)

**TikTok**
- Follower count is not a direct ranking factor, so a new account can break out. [platform, via secondary sources]
- Completion rate and rewatches lead. Aim for 70%+ completion; our clips are 15-30 s for that reason. [reported]
- Distribution follows interest clusters, not followers: stay on one niche (calm focus, study, phone-down). [reported]
- Captions and on-screen text are searched, so write them with the words people type ("focus app", "study timer"). [reported]
- Our videos are code-rendered, so the pipeline always sends the "AI-generated" flag as false.

**YouTube Shorts**
- Since 1 Oct 2026, original content is prioritised and re-uploads lose Shorts feed reach. [platform, quoted from a Help
  post by a secondary source] Our renders are original, but don't re-upload other people's clips.
- A bias towards videos under ~30 days old. [reported, not confirmed by YouTube]
- Viewers who watch several Shorts from one channel in a session are prompted to subscribe. [reported]

**X**
- Posts with an external link get much less reach; the usual workaround is to put the link in a reply to your own post.
  [reported; figures vary a lot]
- Free accounts get little reach (median under ~100 impressions per post). [reported]
- A per-creator cap limits how many of your posts show in one follower's feed, so posting more doesn't add reach. [reported]
- X published its ranking code at `xai-org/x-algorithm` in Jan 2026; read it before trusting any blog. [reported]

## The low-touch routine

**Once (setup, ~1 h)**
- Bio with keywords and one clear line: "Cute focus apps. Android beta now, iOS soon."
- Link in bio on all three; profile photo and name the same everywhere (Focal Studio).
- Pin an intro video on TikTok and YouTube.
- Follow 30-50 accounts in focus, study and productivity on each platform. This tells the platform which niche the
  account belongs to; it is not a follow-back trade (see below).
- Install the Buffer mobile app and allow notifications ([SETUP.md](SETUP.md) step 1).

**Weekly (~10 min)**
- Review the `chore: queue <week>` PR: look at the cover stills, delete the file of any post you don't want, merge.
  Merging is the approval.
- Open TikTok Studio and YouTube Studio. Note completion % and average watch time per post. Keep the hooks that held
  viewers and cut the worst two from `apps/wildfocus.yml`.

**Daily (~2 min)**
- TikTok sends a Buffer alert at 20:00 UTC: open it, add a trending sound in TikTok, post. Skip it if the clip isn't
  worth posting.
- Reply to comments on our own posts within a few hours. Early replies help; on TikTok, one good comment a week can
  become a video reply.

## Per platform

- **TikTok.** 7 a week. Text hook in the first second. Name the series ("Focus rabbit #3") so viewers binge. 3-5 niche
  hashtags (#studytok, #focus, #productivity, #adhd) plus keywords in the caption. Add a trending sound while finishing
  the post in the app; the API can't.
- **YouTube Shorts.** Same render, a title written for search (100 chars max, set in `apps/wildfocus.yml`). 3-5 a
  week is enough; ours post daily. Group the Shorts into a playlist.
- **X.** Short caption, the video, and no link in the post. Today `draft-week` puts the app link in the X text itself; moving it to
  a reply to our own post is parked (PARKING.md). Don't spend effort here beyond the pipeline: the platform rewards accounts that engage, and we have
  chosen not to.
- **All three.** A different hook and title per platform, no watermarks (our renders are clean), and nothing posted
  that isn't original.

## Questions we get asked

**Should we post a batch of warm-up videos to build a history? No.** Filler teaches TikTok the wrong audience and drags
down average completion. The history that counts is the real format, posted daily, and the pipeline already does that.
Optional one-off: 15 minutes at setup scrolling #studytok and #focus on the account, liking a few posts, so the account
gets an interest profile. Nothing after that.

**Should we follow people to get followed back? No.** People who follow back don't watch your niche, so engagement rate
falls, and mass following trips spam limits on all three platforms. The one-time follow of 30-50 niche accounts above is
a niche signal, not a trade.

## Skipped by choice

Commenting on other creators' posts, stitches and duets, and daily replies on X. Each can add reach. We trade that
reach for time. If growth stalls after ~6 weeks of daily posting, this is
the first thing to add: 5 real comments a day on posts from mid-size creators in the niche, in the first hour after
they post.

## Metrics to watch

| Metric | Where | Good sign |
|---|---|---|
| Completion % | TikTok Studio, YouTube Studio | 70%+ on Shorts and TikTok |
| Average watch time | same | close to the clip length |
| Shares | same | more shares than likes on a post |
| Profile views to follows | TikTok Studio | rising week on week |
| Views by post | `node scripts/publish.mjs buffer-posts` | no post stuck at 0 for 48 h |

A post at 0 views after 48 h usually means it is private, under review, or the account is still being tested; check
its privacy setting in the app first.

## Don't

- Buy followers or engagement.
- Mass-follow and unfollow.
- Delete posts that flopped; archive them.
- Repost the same clip unchanged. Reuse it with a new hook, as the drafter does.
- Claim availability that isn't true (iOS is "soon" until it ships).

## Sources

- TikTok: [Hootsuite](https://blog.hootsuite.com/tiktok-algorithm/), [Sprout Social](https://sproutsocial.com/insights/tiktok-algorithm/), [Toptal](https://www.toptal.com/creator/post/how-to-get-more-followers-on-tiktok), [BrainPost](https://brainpostio.com/blog/how-to-grow-on-tiktok)
- YouTube: [Metricool](https://metricool.com/youtube-trends/), [TunePocket](https://www.tunepocket.com/youtube-shorts-algorithm-update-focus-on-freshness-and-search/), [OutlierKit](https://outlierkit.com/resources/youtube-shorts-algorithm/)
- X: [SocialPilot](https://socialpilot.co/blog/twitter-algorithm), [PostEverywhere](https://posteverywhere.ai/blog/how-the-x-twitter-algorithm-works)
