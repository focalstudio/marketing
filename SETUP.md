# Setup: accounts and secrets

## Context
Build step 1 is done: `focalstudio/marketing` exists (private), seeded from
`~/Desktop/focal-kit-business/`. Step 2 can only be done by you, because it needs your
logins. This guide covers everything that has to exist before `publish.mjs` (step 3) can
post. 
Budget about 2 h in total. Meta is the slow part.

## How secrets get in (applies to every step)
Run this from `~/Desktop/focal-kit-business`. It prompts for the value, which keeps it out
of your shell history:
```
gh secret set NAME --repo focalstudio/marketing
```
Never paste a key into chat, a file or a commit. To check what's set:
`gh secret list --repo focalstudio/marketing`.

## 0. Handle: `focalstudiohq` (checked 2026-10-08)
`focalstudio` is taken on YouTube (an active "FocalStudio" channel) and on TikTok (a
dormant private account), so we use **`focalstudiohq`** everywhere.

| Platform | `focalstudiohq` |
|---|---|
| Bluesky | ✅ free |
| dev.to | ✅ free |
| YouTube | ✅ free |
| TikTok | ✅ free |
| X, Instagram, Threads | ❓ check while logged in |

Threads takes the Instagram username, so checking Instagram covers both.

Accounts you already have:
- **TikTok `focalstudio_apps`**: rename it rather than starting over, because the rename
  keeps your followers and videos. Go to Profile → **Edit profile** → **Username** →
  `focalstudiohq` → Save. TikTok allows one change every 30 days, and the old name stays
  reserved for a while.
- **Reddit `u/focalstudio_apps`**: Reddit usernames **can't be changed**. Only the
  display name can (Profile → Settings → Profile → Display name → "Focal Studio"). Keep
  this account. Reddit isn't part of the auto-posting pipeline, and subreddits treat
  brand accounts with suspicion anyway. For helpful-first replies, posting from your
  personal account usually lands better.

**Claim all six on the same day**, before anything else, so nobody takes it in between.
One Google account should own the YouTube channel. Use a studio email for all of them,
not a personal one. Display name everywhere: **Focal Studio**.

## 1. Buffer: X, YouTube, TikTok (20 min)
1. Sign up at buffer.com on the **Free** plan.
2. Connect three channels: **X**, **YouTube** (choose the channel, not the Google account),
   and **TikTok**. If Buffer offers TikTok only in "notification" (manual-finish) mode,
   switch the TikTok account to a Business account so posts publish directly.
3. Settings → API → generate a **personal API key**.
4. Secret: `BUFFER_API_KEY`.

Step 3 fetches the channel IDs through the API, so you don't need to copy them.

## 2. Bluesky (5 min)
1. Create the account.
2. Settings → Privacy and security → **App passwords** → Add. Name it `marketing-pipeline`.
3. Secrets: `BLUESKY_HANDLE` (`focalstudiohq.bsky.social`) and `BLUESKY_APP_PASSWORD`.

## 3. Meta: Threads + Instagram (45–60 min, the fiddly one)
1. In the Instagram app, set the account to **Professional** (Creator or Business). Create
   **Threads** from that Instagram account.
2. Go to developers.facebook.com → **Create app**. Add two use cases:
   - **Access the Threads API**, with scopes `threads_basic` and `threads_content_publish`
   - **Instagram API with Instagram Login**, with scopes `instagram_business_basic` and
     `instagram_business_content_publish`. No Facebook Page is needed.
3. Leave the app in **Development mode**. App review isn't needed to post to your own account.
4. App roles → add your Threads and Instagram accounts as **testers**. Then accept the
   invites inside each app: Threads → Settings → Account → Website permissions → Invites,
   and the matching place in Instagram's settings.
5. Generate a user token for each in the app dashboard. Exchange it for a **long-lived
   (60-day)** token. The dashboard's token tool does this, or you can call the
   `access_token?grant_type=th_exchange_token` / `ig_exchange_token` endpoints.
6. Secrets: `THREADS_USER_ID`, `THREADS_TOKEN`, `IG_USER_ID`, `IG_TOKEN`.

The tokens expire after 60 days, so `.github/workflows/refresh-tokens.yml` renews both every
Monday at 06:17 UTC. To run it by hand: `gh workflow run refresh-tokens.yml --repo focalstudio/marketing`.
- It runs `node scripts/publish.mjs refresh`, which gets a new 60-day token for each platform
  and masks it before anything can print it. The log shows only the platform and how many
  days the new token lasts.
- It then saves each new token with `gh secret set` as the **focal-studio-cross-repo-bot**
  App, so that App needs **Secrets: read & write** on this repo (see step 6). Without it,
  the save step fails with 403.
- Meta only refreshes a token that is at least 24 h old and not yet expired. A token that
  fails to refresh keeps its current secret, and the run goes red so GitHub emails you. The
  other token is still saved. If a token has already expired, generate a new one as in step 5.
- `check` with `refresh` runs `refresh --dry-run`, which reports whether a refresh would work
  and saves nothing.

## 4. dev.to (3 min)
1. Create the account.
2. Settings → Extensions → **DEV Community API Keys** → Generate.
3. Secret: `DEVTO_API_KEY`.

## 5. Video hosting: done
Videos are committed to the public `focalstudio/media` repo and served from
`https://raw.githubusercontent.com/focalstudio/media/main/<file>`. Buffer needs a direct,
public, non-redirecting HTTPS URL, and GitHub release downloads redirect, so raw URLs are
used instead. No Cloudflare account and no extra secrets. Keep each file under 50 MB.

Workflow: render and iterate in `~/Desktop/FOCAL STUDIO/Focal_studio/media/`, move the chosen cut into
`media/final_videos/`, then run `node scripts/push-media.mjs <file> [app]`. It uploads that one file with
your `gh` login (no clone needed) and prints the `media:` line for the queue post. Only finals go to the
repo, and they are never deleted: git history keeps the bytes anyway, and IG and Threads fetch the URL
after the post is created. At about 3 MB a clip, the repo holds a few hundred before it nears 1 GB.

## 6. GitHub plumbing (10 min)
- **Bot App**: `FOCALSTUDIO_BOT_APP_ID` and `FOCALSTUDIO_BOT_PRIVATE_KEY` are already org
  secrets visible to all repos, so the marketing repo inherits them. Still to do: org
  settings → GitHub Apps → focalstudio bot → Configure:
  - add `marketing` to its repositories (and `media` if you chose that option)
  - grant **Contents**, **Pull requests** and **Secrets** read & write
  - make sure it can read the app repos (WildFocus, tick, vestia) and the template's
    `fleet` branch
- **Claude**: `CLAUDE_CODE_OAUTH_TOKEN` is a *repo* secret on the template, and GitHub
  never reveals a secret's value. Run `claude setup-token`, then set the result on
  `focalstudio/marketing`. Alternatively, move it to an org secret so both repos share it.
- Actions minutes: private repos get 2,000 free minutes a month. The pipeline should use
  well under 300.

## 7. Two small fills
- `apps/wildfocus.yml`: replace the two `TODO` store links.
- `voice.md`: replace the two example posts with 5–10 real posts you wrote.

## Done when
`gh secret list --repo focalstudio/marketing` shows the following, and the bot App lists
`marketing`:
- `BUFFER_API_KEY`
- `BLUESKY_HANDLE`, `BLUESKY_APP_PASSWORD`
- `THREADS_USER_ID`, `THREADS_TOKEN`
- `IG_USER_ID`, `IG_TOKEN`
- `DEVTO_API_KEY`
- either the five `R2_*` secrets or the media repo
- `CLAUDE_CODE_OAUTH_TOKEN`

Then tell me, and I'll build step 3. Its first run is a dry-run that only *reads*: it
lists the Buffer channels, checks the Bluesky login, and gets the Threads/IG user and
dev.to user. That proves every key works before anything is posted.
