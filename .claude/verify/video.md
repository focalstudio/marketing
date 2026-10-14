# video renderer

- **Exists:** `video/` (`kit/`, `styles/`, `clips/`, `tests/`), goldens in `video/tests/goldens/`, `apps/<app>.yml` assets.
- **Drive:** `python3 -m unittest discover -s video/tests -t . -v` (needs Pillow and ffmpeg).
- **Prove:** the unittest run passes with the Pillow pinned in `video-tests.yml`. CI also renders two real clips.
- **Lies:** goldens only match the pinned Pillow wheel, so a local mismatch may be the wheel. Re-bless a golden only when the visual change is intended, never to silence a failure.
