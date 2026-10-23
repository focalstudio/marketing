"""Video kit tests (stdlib unittest): python -m unittest discover -s video/tests -t .

Goldens were rendered by the original scripts/render-*.py before the kit existed; the kit must reproduce them.
"""
import inspect, json, os, re, unittest

from PIL import Image, ImageChops, ImageStat

from video.kit import audio, brand, core
from video.styles import base

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = os.path.join(HERE, "goldens")
STORIES = ["collect", "phone_down", "night_owls", "rare_find"]  # appart-only (apps/wildfocus.yml: styles: [appart])
PAIRS = [("meditate", "toon"), ("meditate", "lowpoly"), ("meditate", "pixel"), ("meditate", "appart")] + [(c, "appart") for c in STORIES]
STYLES = ["toon", "lowpoly", "pixel", "ink", "appart"]
CLIPS = ["meditate"] + STORIES


def clip_styles(clip):  # the clip's `styles: [..]` in apps/wildfocus.yml, else the app's (as units() in scripts/draft-week.mjs)
    with open(os.path.join(brand.APPS, "wildfocus.yml")) as f:
        yml = f.read()
    m = re.search(rf"^  {clip}:\n(?:    .*\n|\n)*?    styles: \[(.*?)\]", yml, re.M)
    return [x.strip() for x in (m.group(1) if m else re.search(r"^styles: \[(.*?)\]", yml, re.M).group(1)).split(",")]


TIMES = [1, 4, 6, 10, 12.5, 14.5]
MOVED = {("night_owls", 12.5): 13.8}  # the bat is mid-flight at 12.5 and its antialiasing drifts on Linux; a still after it left


def at(clip, t):
    return MOVED.get((clip, t), t)
HAVE_ICON = os.path.exists(brand.icon_path("wildfocus"))


def render(clip, style, t):
    board, sty = core.load(clip, style)
    A = sty.assets()
    sty.reset(A, board)
    sty.advance(A, round(t * core.FPS))
    return sty, sty.to_rgb(core.frame(sty, A, board, t), check=True)


@unittest.skipUnless(HAVE_ICON, f"app icon missing at {brand.icon_path('wildfocus')} (set APP_REPO_DIR)")
class Goldens(unittest.TestCase):
    def test_frames_match_goldens(self):
        for clip, style in PAIRS:
            for t in TIMES:
                t = at(clip, t)
                with self.subTest(clip=clip, style=style, t=t):
                    _, im = render(clip, style, t)
                    gold = Image.open(os.path.join(GOLD, f"{clip}-{style}", f"{t:05.2f}.webp")).convert("RGB")
                    self.assertEqual(im.size, (core.W, core.H))
                    mean = sum(ImageStat.Stat(ImageChops.difference(im, gold)).mean) / 3
                    self.assertLess(mean, 1.0, f"mean abs diff {mean:.3f}")

    def test_new_pair_renders(self):  # meditate in ink exists only through the kit: no golden, just a sane frame
        for t in (1, 10, 14.5):
            _, im = render("meditate", "ink", t)
            self.assertEqual(im.size, (core.W, core.H))
            self.assertGreater(len(im.getcolors(1 << 20) or ()), 100)


class Audio(unittest.TestCase):
    def test_argv_matches_original(self):
        # ffmpeg's noise sources are randomly seeded, so the WAV hash changes every run; the filter graph must not.
        board, _ = core.load("meditate", "toon")
        a = board["audio"]
        with open(os.path.join(GOLD, "meditate-audio.json")) as f:
            self.assertEqual(audio.audio_argv("OUT.wav", board["dur"], a["chimes"], a["gust"]), json.load(f))

    def test_seed_pins_the_noise(self):
        # A seed gives both noise sources a fixed seed and changes nothing else in the graph.
        a = audio.audio_argv("OUT.wav", 18, [(1, 440)], 5, seed=7)
        self.assertEqual([x for x in a if x.startswith("anoisesrc")], ["anoisesrc=d=18:c=brown:r=44100:a=0.7:seed=7", "anoisesrc=d=18:c=pink:r=44100:a=0.4:seed=8"])
        self.assertEqual([x.replace(":seed=7", "").replace(":seed=8", "") for x in a], audio.audio_argv("OUT.wav", 18, [(1, 440)], 5))



class PoseAPI(unittest.TestCase):
    def test_every_style_implements_the_shared_api(self):
        for style in STYLES:
            sty = core.load("meditate", style)[1]
            for name in base.POSES + ("text_line",):
                with self.subTest(style=style, method=name):
                    fn = getattr(type(sty), name)
                    self.assertIsNot(fn, getattr(base.Style, name), "not implemented")
                    self.assertEqual(inspect.signature(fn), inspect.signature(getattr(base.Style, name)))
            self.assertTrue(any(hasattr(sty, "scene_" + k) for k in base.SCENES))

    @unittest.skipUnless(HAVE_ICON, "app icon missing")
    def test_poses_draw(self):
        for style in STYLES:
            sty = core.load("meditate", style)[1]
            sty.assets()
            with self.subTest(style=style):
                self.assertIsNotNone(sty.rabbit(1.0, 0.5, 1))
                for sat in (0, 1):
                    self.assertIsNotNone(sty.fox(3.0, 1.0, sat, False, 4.0, 0.5))
                    self.assertIsNotNone(sty.deer(3.0, 1.0, sat, False, 4.0))
                    self.assertIsNotNone(sty.hedgehog(3.0, 1.0, sat, False, 4.0))


@unittest.skipUnless(HAVE_ICON, "app icon missing")
class Appart(unittest.TestCase):
    """The storyboard motions and props, through a synthetic board (the story clips use the same keys)."""

    def board(self, **sc):
        return dict(dur=20.0, audio=None, scenes=[dict(name="w", start=0.0, kind="world", **sc)])

    def draw(self, t, **sc):
        sty = core.load("meditate", "appart")[1]
        A = sty.assets()
        return sty.scene(A, self.board(**sc)["scenes"][0], t, t)

    def diff(self, a, b):
        return ImageChops.difference(a, b).getbbox()

    def test_motions(self):
        base = self.draw(0.0)
        for name, a, t0, t1 in [
            ("pop", dict(kind="owl", motion="pop", enter=1.0, x=540, y=1400), 0.9, 2.0),
            ("hop", dict(kind="bat", motion="hop", enter=1.0, dur=2.0, x0=200, x1=800, y=1400, hops=3, apex=120), 0.9, 2.5),
            ("slide", dict(kind="fox", motion="slide", enter=1.0, dur=2.0, x0=200, x1=800, y=1400), 0.9, 2.5),
            ("peek", dict(kind="deer", motion="peek", enter=1.0, dur=1.0, x=540, y=1400, ridge=1400), 0.9, 2.5),
        ]:
            with self.subTest(motion=name):
                self.assertIsNone(self.diff(self.draw(t0, cast=dict(a=a)).convert("RGB"), base.convert("RGB")))
                self.assertTrue(self.diff(self.draw(t1, cast=dict(a=a)).convert("RGB"), base.convert("RGB")))

    def test_peek_hides_below_the_ridge(self):
        a = dict(kind="deer", motion="peek", enter=0.0, dur=2.0, x=540, y=1500, ridge=1500, shadow=False)
        base = self.draw(0.0).convert("RGB")
        bbox = self.diff(self.draw(0.3, cast=dict(a=a)).convert("RGB"), base)
        self.assertIsNotNone(bbox)
        self.assertLessEqual(bbox[3], 1500)

    def test_freeze_stops_motion(self):
        a = dict(kind="fox", motion="slide", enter=0.0, dur=4.0, x0=100, x1=900, y=1400, bob=0, freeze=[(1.0, 2.0)])
        base = self.draw(0.0).convert("RGB")
        left = lambda t: self.diff(self.draw(t, cast=dict(a=a)).convert("RGB"), base)[0]
        self.assertGreater(abs(left(0.5) - left(1.0)), 30)  # moving before the freeze
        self.assertLess(abs(left(1.2) - left(1.8)), 12)  # stands (jitters) during it
        self.assertGreater(abs(left(3.0) - left(1.8)), 30)  # and moves on after

    def test_props(self):
        day = self.draw(0.0).convert("RGB")
        lum = lambda im: sum(ImageStat.Stat(im.crop((0, 0, 1080, 600))).mean)
        night = self.draw(4.0, sky=dict(dusk=(0, 1), night=(1, 2), stars=dict(n=60, fade=(2, 3)))).convert("RGB")
        self.assertLess(lum(night), lum(day) * 0.6)
        tm = dict(x=540, y=300, run=(0, 4), fade=(0, 0.1))
        self.assertTrue(self.diff(self.draw(0.5, timer=tm).convert("RGB"), self.draw(3.5, timer=tm).convert("RGB")))
        ph = dict(x=540, y=1500, buzz=[(1, 2)])
        self.assertTrue(self.diff(self.draw(1.01, phone=ph).convert("RGB"), self.draw(2.5, phone=ph).convert("RGB")))
        self.assertTrue(self.diff(self.draw(1.01, phone=ph).convert("RGB"), self.draw(1.06, phone=ph).convert("RGB")))
        ct = dict(x=540, y=300, steps=[(0.5, "Day 1/7"), (2.0, "Day 3/7")])
        self.assertIsNone(self.diff(self.draw(0.2, counter=ct).convert("RGB"), day))
        self.assertTrue(self.diff(self.draw(1.5, counter=ct).convert("RGB"), self.draw(3.0, counter=ct).convert("RGB")))

    def test_unknown_cast_name(self):
        from video.styles.base import Unsupported
        with self.assertRaises(Unsupported):
            self.draw(1.0, cast=dict(a=dict(kind="dragon", x=500, y=1400)))

    def test_style_names_no_app(self):
        with open(os.path.join(HERE, "..", "styles", "appart.py")) as f:
            src = f.read().lower()
        for n in {brand.app_config(a)["name"].lower() for a in brand.apps()} | {"landscape", "animals"}:
            self.assertNotIn(n, src)


@unittest.skipUnless(HAVE_ICON, "app icon missing")
class PixelPalette(unittest.TestCase):
    def test_palette_and_geometry(self):
        from video.styles import pixel
        self.assertEqual((pixel.LW * 8, pixel.LH * 8), (core.W, core.H))
        for t in (0.5, 6.0, 10.6, 12.9, 13.2, 13.45, 15.0):  # wind, sparks, Bayer dissolve, end card
            with self.subTest(t=t):
                render("meditate", "pixel", t)  # to_rgb(check=True) runs check_palette before the logo overlay

    def test_logo_is_never_pixelated(self):
        _, im = render("meditate", "pixel", 15.0)
        from video.styles import pixel
        self.assertTrue({c for _, c in im.getcolors(1 << 20)} - set(pixel.RGB), "logo should add non-palette colours")


class Timeline(unittest.TestCase):
    def test_boards(self):
        for clip, style, variant in [(c, s, v) for c in CLIPS for s in clip_styles(c) for v in core.variants(c) or [None]]:
            board, _ = core.load(clip, style, variant)
            dur, scenes = board["dur"], board["scenes"]
            with self.subTest(clip=clip, style=style, variant=variant):
                starts = [s["start"] for s in scenes]
                self.assertEqual(starts[0], 0.0)
                self.assertEqual(starts, sorted(starts))
                self.assertTrue(all(0 <= s < dur for s in starts))
                self.assertEqual(len({s["name"] for s in scenes}), len(scenes))
                for i, sc in enumerate(scenes):
                    end = scenes[i + 1]["start"] if i + 1 < len(scenes) else dur
                    if sc.get("enter"):
                        self.assertGreater(i, 0)
                        self.assertLessEqual(sc["enter"]["until"], end)
                    for g in sc.get("text", ()):
                        for k in ("show", "fade_in", "fade_out"):
                            if g.get(k):
                                self.assertLessEqual(g[k][0], g[k][1])
                                self.assertLessEqual(sc["start"] + g[k][1], dur + 1e-9)
                        for ln in g["lines"]:
                            for k in ("pop", "rise", "fade"):
                                if k in ln:
                                    self.assertLess(ln[k][0], ln[k][1])
                                    self.assertLessEqual(sc["start"] + ln[k][1], dur)
                    for a in sc.get("cast", {}).values():
                        self.assertLessEqual(sc["start"] + a["enter"] + a.get("dur", 0), end)
                for at, hz in (board["audio"] or {}).get("chimes", ()):
                    self.assertTrue(0 < at < dur)

    def test_stories(self):  # the appart-only clips: every variant renders at the start, the middle and the end card
        for clip in STORIES:
            for variant in core.variants(clip) or [None]:
                board, sty = core.load(clip, "appart", variant)
                dur, scenes = board["dur"], board["scenes"]
                with self.subTest(clip=clip, variant=variant):
                    self.assertEqual([s["start"] for s in scenes][0], 0.0)
                    self.assertEqual(scenes[-1]["kind"], "end")
                    self.assertTrue(0 < scenes[-1]["start"] < dur)
                    if HAVE_ICON:
                        A = sty.assets()
                        for t in (1.0, dur / 2, dur - 0.5):
                            im = core.frame(sty, A, board, t)
                            self.assertEqual(im.size, (core.W, core.H))

    def test_chimes_land_on_settles(self):
        from video.clips import meditate
        board, _ = core.load("meditate", "toon")
        cast = board["scenes"][0]["cast"]
        chimes = [at for at, _ in board["audio"]["chimes"]]
        for name, a in cast.items():
            self.assertAlmostEqual(a["enter"] + a["dur"], meditate.SETTLE[name])
            self.assertIn(meditate.SETTLE[name], chimes)

    def test_clips_import_no_style(self):
        for clip in CLIPS:
            with open(os.path.join(HERE, "..", "clips", clip + ".py")) as f:
                self.assertNotIn("styles", f.read())

    def test_clips_name_no_app(self):  # the app comes from apps/<app>.yml; a clip writes "{app}"
        names = {brand.app_config(a)["name"].lower() for a in brand.apps()}
        for clip in CLIPS:
            with open(os.path.join(HERE, "..", "clips", clip + ".py")) as f:
                src = f.read().lower()
            for n in names:
                self.assertNotIn(n, src, clip)

    def test_app_name_fills_text(self):
        board, _ = core.load("meditate", "pixel")
        lines = [ln["s"] for sc in board["scenes"] for tx in sc.get("text", ()) for ln in tx["lines"]]
        self.assertIn("WILDFOCUS", lines)
        self.assertFalse([s for s in lines if "{" in s])


class Brand(unittest.TestCase):
    def env(self, **kw):
        from unittest import mock
        p = mock.patch.dict(os.environ, kw)
        p.start()
        self.addCleanup(p.stop)
        for k in ("APP_REPO_DIR", "WILDFOCUS_REPO", "APPS_DIR"):
            if k not in kw:
                os.environ.pop(k, None)

    def test_app_config(self):
        cfg = brand.app_config("wildfocus")
        self.assertEqual((cfg["name"], cfg["repo"]), ("WildFocus", "focalstudio/WildFocus"))
        self.assertTrue(cfg["icon"].endswith(".png"))
        self.assertEqual(brand.app_for("meditate"), "wildfocus")

    def test_repo_dir_precedence(self):
        self.env()
        self.assertEqual(brand.repo_dir("wildfocus"), os.path.normpath(os.path.join(brand.ROOT, "..", "WildFocus")))
        self.env(WILDFOCUS_REPO="/alias")
        self.assertEqual(brand.repo_dir("wildfocus"), "/alias")
        self.env(APP_REPO_DIR="/app", WILDFOCUS_REPO="/alias")
        self.assertEqual(brand.repo_dir("wildfocus"), "/app")
        self.assertEqual(brand.icon_path("wildfocus"), os.path.join("/app", brand.app_config("wildfocus")["icon"]))
        self.env(APPS_DIR="/apps")
        self.assertEqual(brand.repo_dir("wildfocus"), "/apps/WildFocus")
        self.env(APPS_DIR="/apps", APP_REPO_DIR="/app")
        self.assertEqual(brand.repo_dir("wildfocus"), "/app")

    def test_assets(self):
        a = brand.app_section("wildfocus", "assets")
        self.assertEqual(set(a), {"backdrop", "cast", "hero"})
        if HAVE_ICON:
            names = brand.cast_paths("wildfocus")
            self.assertGreaterEqual(len(names), 41)
            self.assertTrue({"owl", "bat", "snow_leopard", "rabbit"} <= set(names))
            self.assertTrue(brand.asset_path("backdrop", "wildfocus").endswith("landscape.png"))

    def test_font_is_committed_and_bold(self):
        self.assertTrue(os.path.exists(brand.FONT), brand.FONT)
        self.assertTrue(os.path.exists(os.path.join(brand.ROOT, "video", "fonts", "OFL.txt")))
        bold, light = brand.font(100).getbbox("WildFocus"), brand.font(100, "Light").getbbox("WildFocus")
        self.assertGreater(bold[2], light[2])  # the variation applies: Bold sets wider than Light

    def test_brand_font_override(self):
        import importlib, subprocess, sys
        out = subprocess.run([sys.executable, "-c", "from video.kit import brand; print(brand.FONT)"], cwd=brand.ROOT,
                             env=dict(os.environ, BRAND_FONT="/x.ttf"), capture_output=True, text=True, check=True)
        self.assertEqual(out.stdout.strip(), "/x.ttf")


if __name__ == "__main__":
    unittest.main()


class Variants(unittest.TestCase):
    def setUp(self):
        import sys, types
        m = types.ModuleType("video.clips._variant_probe")
        m.BOARD = dict(dur=4.0, audio=None, scenes=[dict(name="a", start=0.0, kind="title", text=[dict(lines=[dict(s="base")])])])
        m.OVERRIDES = {"toon": dict(a=dict(tint="style"))}
        m.VARIANTS = {"alt": dict(a=dict(tint="variant", text=[dict(lines=[dict(s="alt")])]))}
        sys.modules[m.__name__] = m
        self.addCleanup(sys.modules.pop, m.__name__)

    def test_variant_patches_after_style_overrides(self):
        sc = core.load("_variant_probe", "toon")[0]["scenes"][0]
        self.assertEqual((sc["tint"], sc["text"][0]["lines"][0]["s"]), ("style", "base"))
        sc = core.load("_variant_probe", "toon", "alt")[0]["scenes"][0]
        self.assertEqual((sc["tint"], sc["text"][0]["lines"][0]["s"]), ("variant", "alt"))

    def test_unknown_variant_is_an_error(self):
        with self.assertRaises(SystemExit):
            core.load("_variant_probe", "toon", "nope")
        self.assertEqual(core.variants("_variant_probe"), ["alt"])
        self.assertEqual(core.variants("meditate"), [])
