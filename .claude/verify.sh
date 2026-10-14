#!/bin/sh
# The repo's proof, run by focal-maintainer before `gh pr create` and `git push`.
# Green is silent to the session; red blocks with the last lines. Offline: no secrets, nothing is posted.
set -e
cd "$(dirname "$0")/.."

node --test scripts/*.test.mjs
node scripts/publish.mjs plan >/dev/null

base=origin/main
git rev-parse -q --verify "$base" >/dev/null || base=main
if git diff --name-only "$base"...HEAD 2>/dev/null | grep -q '^video/\|^apps/'; then
    if python3 -c 'import PIL' 2>/dev/null && command -v ffmpeg >/dev/null; then
        python3 -m unittest discover -s video/tests -t . 2>&1
    else
        echo "video/ or apps/ changed but Pillow or ffmpeg is missing: video-tests CI is the proof" >&2
    fi
fi
