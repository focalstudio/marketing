"""Video kit tests (stdlib unittest): python -m unittest discover -s video/tests -t .

Goldens were rendered by the original scripts/render-*.py before the kit existed; the kit must reproduce them.
"""
import inspect, json, os, unittest

from PIL import Image, ImageChops, ImageStat

from video.kit import audio, brand, core
from video.styles import base

HERE = os.path.dirname(os.path.abspath(__file__))
GOLD = os.path.join(HERE, "goldens")
PAIRS = [("meditate", "toon"), ("meditate", "lowpoly"), ("meditate", "pixel")]
STYLES = ["toon", "lowpoly", "pixel", "ink"]
CLIPS = ["meditate"]
TIMES = [1, 4, 6, 10, 12.5, 14.5]
HAVE_ICON = os.path.exists(brand.ICON)


def render(clip, style, t):
    board, sty = core.load(clip, style)
    A = sty.assets()
    sty.reset(A, board)
    sty.advance(A, round(t * core.FPS))
    return sty, sty.to_rgb(core.frame(sty, A, board, t), check=True)


@unittest.skipUnless(HAVE_ICON, f"app icon missing at {brand.ICON} (set WILDFOCUS_REPO)")
class Goldens(unittest.TestCase):
    def test_frames_match_goldens(self):
        for clip, style in PAIRS:
            for t in TIMES:
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
        for clip in CLIPS:
            for style in STYLES:
                board, _ = core.load(clip, style)
                dur, scenes = board["dur"], board["scenes"]
                with self.subTest(clip=clip, style=style):
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
