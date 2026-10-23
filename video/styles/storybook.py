"""Storybook style: a flat vector picture book. Smooth rolling hills and round-crowned trees in a warm limited palette
(cream, peach, ochre, terracotta, sage, WildFocus green), thin darker outlines on the animals, and a paper grain printed
over every frame. The animals move smoothly (24 poses a second), unlike the stepped paper style.

Plays the appart storyboards (see _drawn.py); the art is drawn from video.kit.species and nothing comes from the app.
"""
import math, random

from PIL import Image, ImageChops, ImageDraw

from ..kit import species
from ..kit.core import W, H
from ._drawn import PAD, SS, Style as Base, grain, sheet

CREAM, PEACH, OCHRE, TERRA, SAGE, GREEN, DEEP = (254, 240, 210), (248, 212, 160), (228, 176, 104), (206, 118, 84), (150, 170, 110), (104, 146, 94), (74, 124, 89)
WARM = (255, 226, 178)
HILLS = [  # (ridge y, amplitude, colour, depth, trees)
    (1020, 100, OCHRE, 0.2, 0),
    (1170, 80, TERRA, 0.35, 0),
    (1310, 64, SAGE, 0.5, 7),
    (1450, 44, GREEN, 0.7, 4),
    (1690, 28, DEEP, 1.0, 0),
]


def hill(rnd, y, amp, step=18):
    f1, f2, p1, p2 = rnd.uniform(0.003, 0.005), rnd.uniform(0.008, 0.012), rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    return [(x, y + amp * (0.65 * math.sin(x * f1 + p1) + 0.35 * math.sin(x * f2 + p2))) for x in range(0, W + 2 * PAD + step, step)]


def trees(rnd, pts, n):
    """Round-crowned trees standing on the hill `pts`: (polygon, colour) pairs for sheet()."""
    out = []
    for _ in range(n):
        x = rnd.uniform(80, W + 2 * PAD - 80)
        y = min(pts, key=lambda p: abs(p[0] - x))[1] + 6
        s = rnd.uniform(0.8, 1.25)
        out.append(([(x - 5 * s, y), (x + 5 * s, y), (x + 4 * s, y - 60 * s), (x - 4 * s, y - 60 * s)], (112, 78, 56)))
        out.append((species.ell(x, y - 84 * s, 34 * s, 40 * s), rnd.choice([(226, 150, 88), (172, 150, 76), (98, 136, 84)])))
    return out


def sky():
    w = W + 2 * PAD
    col = Image.new("L", (1, H))
    col.putdata([round(255 * min(1.0, y / 1100)) for y in range(H)])
    img = Image.composite(Image.new("RGB", (w, H), CREAM), Image.new("RGB", (w, H), PEACH), col.resize((w, H)))
    d = ImageDraw.Draw(img)
    cx, cy = PAD + 790, 430
    d.ellipse([cx - 190, cy - 190, cx + 190, cy + 190], fill=(250, 224, 176))
    d.ellipse([cx - 130, cy - 130, cx + 130, cy + 130], fill=(244, 170, 108))
    for x, y, r in [(260, 300, 1.0), (880, 760, 0.7)]:  # flat clouds
        for dx, dy, rr in [(-60, 10, 36), (-10, -14, 48), (44, 0, 40), (0, 24, 44)]:
            d.ellipse([PAD + x + (dx - rr) * r, y + (dy - rr) * r, PAD + x + (dx + rr) * r, y + (dy + rr) * r], fill=(255, 250, 236))
    return ImageChops.multiply(img, grain(w, H, 2, 246, 255)).convert("RGBA")


class Style(Base):
    name = "storybook"
    STEPS = 24
    STROKE = 0.065

    def __init__(self):
        super().__init__()
        self.paper = None

    def build(self):
        rnd = random.Random(11)
        layers = [dict(img=sky(), depth=0.0, phase=0.0)]
        for i, (y, amp, col, depth, n) in enumerate(HILLS):
            pts = hill(rnd, y, amp)
            layers.append(dict(img=sheet(pts, col, 20 + i, halo=0, trees=trees(rnd, pts, n)), depth=depth * 0.5, phase=1.0 + i))
        return layers

    def tone(self, col):
        return tuple(round(c * 0.86 + w * 0.14) for c, w in zip(col, WARM))

    def stamp(self, cv, xy, col):
        edge = tuple(int(c * 0.68) for c in col)
        d = ImageDraw.Draw(cv)
        d.polygon(xy, fill=col + (255,))
        d.line(xy + xy[:1], fill=edge + (255,), width=round(1.4 * SS), joint="curve")

    def to_rgb(self, cv, check=False):
        if self.paper is None:
            self.paper = grain(W, H, 5, 238, 255, 3)
        return ImageChops.multiply(cv.convert("RGB"), self.paper)
