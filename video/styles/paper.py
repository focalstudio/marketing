"""Paper style: layered cutout paper. Torn-edged sheets (sky, hills, pines, meadow) sway at their own depth, and every
animal is cut from paper pieces that cast a soft shadow on the ones below, moving in 12 steps a second like stop motion.

Plays the appart storyboards (see _drawn.py); the art is drawn from video.kit.species and nothing comes from the app.
"""
import math, random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from ..kit.core import W, H
from . import appart
from ._drawn import PAD, SS, Style as Base, grain, sheet

SKY_TOP, SKY_LOW = (176, 214, 226), (252, 238, 208)
SUN, CLOUD = (252, 222, 140), (255, 252, 244)
HILLS = [  # (ridge y, amplitude, colour, depth): back to front
    (1010, 110, (150, 188, 190), 0.25),
    (1150, 90, (118, 168, 132), 0.45),
    (1300, 70, (96, 150, 106), 0.65),
    (1440, 46, (120, 170, 96), 0.85),
    (1690, 30, (84, 134, 84), 1.0),
]
PINES = (0.45, 0.65)  # layers (by depth) that carry paper pines


def ridge(rnd, y, amp, jitter=2.5, step=14):
    f1, f2, p1, p2 = rnd.uniform(0.004, 0.007), rnd.uniform(0.011, 0.017), rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    return [(x, y + amp * (0.6 * math.sin(x * f1 + p1) + 0.4 * math.sin(x * f2 + p2)) + rnd.uniform(-jitter, jitter))
            for x in range(0, W + 2 * PAD + step, step)]


def pines(rnd, pts, col, n):
    """Stacked paper triangles standing on the ridge `pts` (they are cut into the same sheet)."""
    out = []
    for _ in range(n):
        x = rnd.uniform(80, W + 2 * PAD - 80)
        y = min(pts, key=lambda p: abs(p[0] - x))[1] + 8
        s = rnd.uniform(0.8, 1.3)
        dark = tuple(int(c * 0.7) for c in col)
        for i in range(3):
            w, h, by = (44 - i * 9) * s, 50 * s, y - i * 34 * s
            out.append(([(x - w, by), (x + w, by), (x, by - h)], dark if i % 2 else tuple(int(c * 0.88) for c in col)))
        out.append(([(x - 5 * s, y + 10), (x + 5 * s, y + 10), (x + 5 * s, y - 14), (x - 5 * s, y - 14)], (120, 88, 64)))
    return out


def sky_sheet():
    w = W + 2 * PAD
    col = Image.new("L", (1, H))
    col.putdata([round(255 * min(1.0, y / 1150)) for y in range(H)])
    t = col.resize((w, H))
    img = Image.composite(Image.new("RGB", (w, H), SKY_LOW), Image.new("RGB", (w, H), SKY_TOP), t)
    return ImageChops.multiply(img, grain(w, H, 1)).convert("RGBA")


def disc(r, col, seed):
    """A paper disc (sun) with a soft shadow, as a full-size layer."""
    w = W + 2 * PAD
    lay = Image.new("RGBA", (w, H), (0, 0, 0, 0))
    cx, cy = PAD + 800, 420
    sh = Image.new("L", (w, H), 0)
    ImageDraw.Draw(sh).ellipse([cx - r + 8, cy - r + 14, cx + r + 8, cy + r + 14], fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(12))
    shadow = Image.new("RGBA", (w, H), (60, 70, 70, 0))
    shadow.putalpha(sh)
    lay.alpha_composite(shadow)
    ImageDraw.Draw(lay).ellipse([cx - r, cy - r, cx + r, cy + r], fill=col + (255,))
    return lay


def clouds(seed):
    w = W + 2 * PAD
    rnd = random.Random(seed)
    lay = Image.new("RGBA", (w, H), (0, 0, 0, 0))
    sh = Image.new("L", (w, H), 0)
    puffs = []
    for cx, cy, s in [(300, 260, 1.0), (860, 600, 0.8), (180, 760, 0.7)]:
        for dx, dy, r in [(-70, 12, 44), (-22, -14, 58), (38, -2, 50), (84, 14, 38), (0, 26, 56)]:
            puffs.append((PAD + cx + dx * s, cy + dy * s, r * s))
    d = ImageDraw.Draw(sh)
    for x, y, r in puffs:
        d.ellipse([x - r + 6, y - r + 12, x + r + 6, y + r + 12], fill=80)
    shadow = Image.new("RGBA", (w, H), (70, 90, 100, 0))
    shadow.putalpha(sh.filter(ImageFilter.GaussianBlur(10)))
    lay.alpha_composite(shadow)
    d = ImageDraw.Draw(lay)
    for x, y, r in puffs:
        d.ellipse([x - r, y - r, x + r, y + r], fill=CLOUD + (255,))
    return lay


class Style(Base):
    name = "paper"
    STEPS = 12
    STROKE = 0.09

    def build(self):
        rnd = random.Random(7)
        layers = [dict(img=sky_sheet(), depth=0.0, phase=0.0), dict(img=disc(120, SUN, 2), depth=0.1, phase=1.0),
                  dict(img=clouds(3), depth=0.18, phase=2.0, drift=4.0)]
        for i, (y, amp, col, depth) in enumerate(HILLS):
            pts = ridge(rnd, y, amp)
            trees = pines(rnd, pts, col, 9 if depth in PINES else 0)
            layers.append(dict(img=sheet(pts, col, 10 + i, trees=trees), depth=depth, phase=3.0 + i))
        return layers

    def stamp(self, cv, xy, col):
        xs, ys = [p[0] for p in xy], [p[1] for p in xy]
        m = 9 * SS
        x0, y0 = int(min(xs)) - m, int(min(ys)) - m
        w, h = int(max(xs)) - x0 + m, int(max(ys)) - y0 + m
        pts = [(x - x0, y - y0) for x, y in xy]
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).polygon(pts, fill=255)
        sh = Image.new("RGBA", (w, h), (40, 30, 20, 0))
        sh.putalpha(mask.filter(ImageFilter.GaussianBlur(2.2 * SS)).point(lambda v: int(v * 0.42)))
        appart.blit(cv, sh, x0 + 1.5 * SS, y0 + 2.5 * SS)
        part = Image.new("RGBA", (w, h), col + (255,))
        part.putalpha(mask)
        edge = tuple(int(c + (255 - c) * 0.35) for c in col)
        ImageDraw.Draw(part).line(pts + pts[:1], fill=edge + (255,), width=SS)
        appart.blit(cv, part, x0, y0)
