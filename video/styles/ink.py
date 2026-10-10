"""Ink style: cream paper, pencil hatching, wobbly ink outlines and a hand-drawn sun, after the Claude ant film.

Shapes are drawn with a Pen in 0..100 units; every vertex wobbles per seed, and BOIL seeded variants of every sprite
are cycled every 3 frames so the outlines "boil" like hand-drawn animation. Sprites are pasted bottom-centre (paste_c).
"""
import math, random
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from ..kit.brand import font, rounded_icon
from ..kit.core import FPS, W, H, zoom
from ..kit.ease import back_out, clamp, ease_io, ease_out, gust, prog
from .base import Style as Base, Unsupported

PAPER, INK, SAGE, SUN = (243, 239, 226), (52, 44, 38), (74, 124, 89), (238, 168, 64)


def paper_texture():
    rnd = random.Random(7)
    base = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(base, "RGBA")
    for _ in range(160):  # faint diagonal pencil strokes
        x, y = rnd.randint(-200, W), rnd.randint(-100, H)
        n = rnd.randint(120, 420)
        d.line([(x, y), (x + n * 0.5, y + n)], fill=(120, 105, 80, rnd.randint(10, 26)), width=rnd.choice([1, 1, 2]))
    grain = Image.effect_noise((W, H), 14).convert("RGB").point(lambda v: 232 + v // 16)
    return Image.blend(base, ImageChops.multiply(base, grain), 0.6).convert("RGBA")


def draw_sun(img, cx, cy, r, t, alpha=255):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(16):
        a = i / 16 * math.tau + 0.25 * math.sin(t * 0.8)
        r0, r1 = r * 1.22, r * (1.5 + 0.1 * math.sin(t * 2 + i))
        d.line([(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a) * r1, cy + math.sin(a) * r1)],
               fill=(226, 120, 60, alpha), width=7)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SUN + (alpha,), outline=INK + (alpha,), width=5)
    clip = Image.new("L", img.size, 0)
    ImageDraw.Draw(clip).ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], fill=255)
    hatch = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hatch)
    for k in range(-2 * r, 2 * r, 16):  # pencil shading on the disc
        hd.line([(cx + k, cy - r), (cx + k + 60, cy + r)], fill=(214, 120, 40, int(alpha * 0.4)), width=3)
    hatch.putalpha(ImageChops.multiply(hatch.getchannel("A"), clip))
    layer.alpha_composite(hatch)
    img.alpha_composite(layer)


def text_c(img, s, y, size, fill=INK, alpha=255, weight="Bold", dy=0, shadow=True):
    f = font(size, weight)
    d = ImageDraw.Draw(img, "RGBA")
    for i, ln in enumerate(s.split("\n")):
        x, yy = (W - d.textlength(ln, font=f)) / 2, y + i * size * 1.12 + dy
        if shadow:
            d.text((x + 3, yy + 4), ln, font=f, fill=(0, 0, 0, int(alpha * 0.12)))
        d.text((x, yy), ln, font=f, fill=fill + (alpha,))
CREAM, PINK, ORANGE, WHITE = (251, 248, 240), (238, 168, 172), (226, 122, 56), (252, 250, 245)
TAN, BROWN, FACE = (200, 150, 98), (122, 88, 62), (230, 200, 160)
BOIL = 4  # outline variants, cycled every 3 frames


def mix(c, d, f):
    return tuple(round(a + (b - a) * f) for a, b in zip(c, d))


def ink_fill(img, pts, fill, w, hatch=True, gap=18):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    layer = Image.new("RGBA", img.size, fill + (255,))
    if hatch:
        hd, (iw, ih) = ImageDraw.Draw(layer), img.size
        for x in range(-ih, iw, gap):
            hd.line([(x, ih), (x + ih * 0.6, 0)], fill=mix(fill, INK, 0.13) + (255,), width=max(2, gap // 7))
    img.paste(layer, (0, 0), mask)
    if w:
        ImageDraw.Draw(img).line(pts + [pts[0]], fill=INK + (255,), width=w, joint="curve")


class Pen:
    """Draws in 0..100 units onto a 2x canvas; every vertex wobbles a little per seed."""

    def __init__(self, k, seed, wob=0.45, w=10):
        self.k, self.rnd, self.wob, self.w = k, random.Random(seed), wob, w
        self.img = Image.new("RGBA", (int(112 * k), int(118 * k)), (0, 0, 0, 0))

    def tp(self, x, y):
        j = self.wob
        return ((x + 6 + self.rnd.uniform(-j, j)) * self.k, (y + 6 + self.rnd.uniform(-j, j)) * self.k)

    def ell(self, cx, cy, rx, ry, fill, rot=0, hatch=True, w=None, n=44):
        a, pts = math.radians(rot), []
        for i in range(n):
            u = i / n * math.tau
            x, y = rx * math.cos(u), ry * math.sin(u)
            pts.append(self.tp(cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
        ink_fill(self.img, pts, fill, self.w if w is None else w, hatch, int(self.k * 2.4))

    def poly(self, pts, fill, hatch=True, w=None):
        ink_fill(self.img, [self.tp(*p) for p in pts], fill, self.w if w is None else w, hatch, int(self.k * 2.4))

    def line(self, pts, w=None):
        ImageDraw.Draw(self.img).line([self.tp(*p) for p in pts], fill=INK + (255,), width=w or self.w, joint="curve")

    def eye(self, cx, cy, r):
        self.ell(cx, cy, r, r * 1.15, INK, hatch=False, w=0)
        self.ell(cx - r * 0.35, cy - r * 0.4, r * 0.35, r * 0.35, WHITE, hatch=False, w=0)


def draw_rabbit(P):  # faces left, carrot in mouth, like the app icon
    P.ell(50, 24, 6.5, 21, CREAM, rot=12)
    P.ell(50, 27, 3, 14, PINK, rot=12, hatch=False, w=0)
    P.ell(86, 72, 7, 7, WHITE)
    P.ell(60, 74, 28, 23, CREAM)
    P.ell(70, 80, 16, 15, CREAM)
    P.ell(70, 96, 15, 4.5, CREAM)
    P.ell(42, 84, 8, 12, CREAM)
    P.ell(42, 96, 7, 4.5, CREAM)
    P.ell(36, 50, 17, 15, CREAM)
    P.ell(38, 22, 6.5, 22, CREAM, rot=-8)
    P.ell(38, 25, 3, 15, PINK, rot=-8, hatch=False, w=0)
    P.ell(29, 56, 4, 2.5, mix(CREAM, PINK, 0.6), hatch=False, w=0)
    P.eye(30, 47, 2.8)
    P.ell(20, 51, 2, 1.6, PINK, hatch=False, w=6)
    P.poly([(22, 57), (27, 62), (6, 77)], ORANGE)
    P.line([(24, 58), (27, 50)], w=7)
    P.line([(25, 58), (32, 53)], w=7)


def draw_fox(P):  # sits facing the viewer
    P.ell(74, 90, 24, 9, ORANGE, rot=-15)
    P.ell(94, 85, 7, 6, WHITE, rot=-15)
    P.ell(50, 74, 20, 24, ORANGE)
    P.ell(47, 74, 9, 15, WHITE)
    P.poly([(38, 86), (45, 86), (45, 102), (38, 102)], ORANGE)
    P.poly([(52, 86), (59, 86), (59, 102), (52, 102)], ORANGE)
    P.poly([(32, 30), (34, 8), (46, 26)], ORANGE)
    P.poly([(56, 26), (68, 8), (70, 30)], ORANGE)
    P.poly([(28, 32), (40, 24), (62, 24), (74, 32), (51, 58)], ORANGE)
    P.poly([(36, 42), (66, 42), (51, 58)], WHITE, hatch=False)
    P.eye(43, 36, 2.4)
    P.eye(59, 36, 2.4)
    P.ell(51, 56, 2.6, 2, INK, hatch=False, w=0)


def draw_deer(P):  # stands facing left
    for x in (38, 46, 68, 76):
        P.poly([(x, 60), (x + 5, 60), (x + 5, 100), (x, 100)], mix(TAN, INK, 0.1))
        P.ell(x + 2.5, 101, 3.2, 2, INK, hatch=False, w=0)
    P.ell(82, 51, 4, 3, WHITE)
    P.ell(58, 58, 25, 13, TAN)
    for sx, sy in ((52, 54), (60, 52), (68, 55), (56, 60), (64, 61)):
        P.ell(sx, sy, 1.5, 1.2, WHITE, hatch=False, w=0)
    P.poly([(33, 56), (45, 53), (37, 28), (27, 31)], TAN)
    P.ell(37, 20, 6, 2.6, TAN, rot=-30)
    P.ell(26, 29, 10, 7, TAN, rot=18)
    P.eye(27, 26, 1.7)
    P.ell(17, 33, 1.9, 1.5, INK, hatch=False, w=0)
    P.line([(28, 22), (30, 10), (25, 2)], w=8)
    P.line([(30, 10), (37, 5)], w=8)
    P.line([(29, 16), (23, 12)], w=8)
    P.line([(33, 22), (40, 11), (46, 4)], w=8)
    P.line([(40, 11), (37, 3)], w=8)


def draw_hedgehog(P):  # faces left
    pts = []
    for i in range(29):
        u = math.pi + math.pi * i / 28
        r = 40 if i % 2 else 31
        pts.append((58 + r * math.cos(u), 80 + r * math.sin(u) * 0.95))
    P.poly(pts + [(92, 92), (30, 92)], BROWN)
    for i in range(1, 28, 3):
        u = math.pi + math.pi * i / 28
        P.line([(58 + 18 * math.cos(u), 80 + 17 * math.sin(u)), (58 + 27 * math.cos(u), 80 + 26 * math.sin(u))], w=6)
    P.ell(58, 90, 30, 7, FACE)
    P.ell(30, 82, 17, 11, FACE, rot=-8)
    P.ell(32, 96, 4.5, 2.6, mix(FACE, INK, 0.2))
    P.ell(74, 96, 4.5, 2.6, mix(FACE, INK, 0.2))
    P.eye(25, 77, 1.9)
    P.ell(12, 82, 2.6, 2.1, INK, hatch=False, w=0)


def sprite(fn, h, seed):
    P = Pen(2 * h / 106, seed)
    fn(P)
    im = P.img.resize((P.img.width // 2, P.img.height // 2), Image.LANCZOS)
    return im.crop(im.getbbox())


def wave(rnd, base, amp, freq, phase, step=24):
    pts = [(x, base + amp * math.sin(x * freq + phase) + rnd.uniform(-1.5, 1.5)) for x in range(-30, W + 31, step)]
    return pts + [(W + 30, H + 30), (-30, H + 30)]


def pine(img, rnd, x, base, h):
    j = lambda: rnd.uniform(-2, 2)
    ink_fill(img, [(x - 6 + j(), base), (x + 6 + j(), base), (x + 6, base + 26), (x - 6, base + 26)], (140, 98, 66), 5, False)
    for i, f in enumerate((1.0, 0.78, 0.56)):
        y0 = base - h * (0.18 + 0.3 * i)
        hw = h * 0.34 * f
        ink_fill(img, [(x - hw + j(), y0 + j()), (x + hw + j(), y0 + j()), (x + j(), y0 - h * 0.42 + j())], (88, 128, 90), 5)


def draw_land_fg(seed):
    rnd = random.Random(seed)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ink_fill(img, wave(rnd, 1170, 46, 0.006, 0.8), (198, 214, 164), 5)
    for x, b, h in ((110, 1150, 200), (205, 1175, 150), (905, 1140, 210), (990, 1160, 160)):
        pine(img, rnd, x + rnd.uniform(-1, 1), b, h)
    ink_fill(img, wave(rnd, 1390, 38, 0.005, 2.6), (166, 194, 124), 5)
    pond = [(300 + 175 * math.cos(u) + rnd.uniform(-2, 2), 1500 + 38 * math.sin(u) + rnd.uniform(-1, 1))
            for u in (i / 40 * math.tau for i in range(40))]
    ink_fill(img, pond, (156, 200, 216), 5)
    d = ImageDraw.Draw(img)
    for x in (220, 300, 380):
        d.line([(x - 30, 1500), (x + 30, 1500)], fill=(250, 250, 245, 230), width=4)
    ink_fill(img, wave(rnd, 1600, 14, 0.009, 1.2), (136, 172, 102), 5)
    ink_fill(img, wave(rnd, 1730, 8, 0.012, 0.3), (176, 126, 84), 5, gap=22)
    for _ in range(70):  # soil specks, like the dirt strip in the reference
        x, y, r = rnd.uniform(0, W), rnd.uniform(1760, H), rnd.uniform(4, 13)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(134, 92, 60, 255))
    for _ in range(26):  # grass tufts
        x, y = rnd.uniform(20, W - 20), rnd.uniform(1615, 1712)
        for dx in (-9, 0, 9):
            d.line([(x, y), (x + dx * 1.4 + rnd.uniform(-2, 2), y - rnd.uniform(16, 28))], fill=INK + (255,), width=4)
    return img


def draw_sky(paper, dusk):
    if not dusk:
        img = paper.copy()
        d = ImageDraw.Draw(img, "RGBA")
        for band in range(-H, W, 260):  # pale sun-stripes, as in the reference's sunny panel
            for k in range(0, 110, 11):
                x = band + k
                d.line([(x, H), (x + H * 0.6, 0)], fill=(236, 168, 110, 28), width=3)
        return img
    img = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(img)
    top, bot = (40, 46, 92), (118, 96, 146)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=mix(top, bot, y / H) + (255,))
    for x in range(-H, W, 16):  # night hatching
        d.line([(x, H), (x + H * 0.6, 0)], fill=(255, 255, 255, 14), width=2)
    return img


def draw_stars(img, a, t):
    if a <= 0:
        return
    rnd = random.Random(3)
    d = ImageDraw.Draw(img, "RGBA")
    for i in range(22):
        x, y = rnd.uniform(40, W - 40), rnd.uniform(60, 1000)
        r = rnd.uniform(5, 11) * (0.8 + 0.2 * math.sin(t * 3 + i))
        c = (250, 240, 214, int(a * 255))
        d.line([(x - r, y), (x + r, y)], fill=c, width=3)
        d.line([(x, y - r), (x, y + r)], fill=c, width=3)


class Assets:
    def __init__(self):
        self.paper = paper_texture()
        self.sky_day, self.sky_dusk = draw_sky(self.paper, False), draw_sky(self.paper, True)
        tint = Image.new("RGBA", (W, H), (150, 140, 196, 255))
        self.fg = [draw_land_fg(100 + v) for v in range(BOIL)]
        self.fg_dusk = [ImageChops.multiply(f, tint) for f in self.fg]
        self.rabbit = [sprite(draw_rabbit, 380, v) for v in range(BOIL)]
        self.cast = [[sprite(fn, h, v) for v in range(BOIL)]
                     for fn, h in ((draw_fox, 290), (draw_deer, 380), (draw_hedgehog, 240))]
        self.icon = rounded_icon(300)
        self.v = 0


def land_view(A, t, dusk=0.0, sun_y=330, drift=None):
    """Drawn landscape with an optional slow push-in (drift: (zoom, over s)); dusk fades the sky to night and sinks the sun."""
    img = Image.blend(A.sky_day, A.sky_dusk, dusk) if dusk else A.sky_day.copy()
    draw_stars(img, ease_io(prog(dusk, 0.5, 1.0)), t)
    draw_sun(img, 820, sun_y, 110, t)
    fg = Image.blend(A.fg[A.v], A.fg_dusk[A.v], dusk) if dusk else A.fg[A.v]
    img.alpha_composite(fg)
    if drift is None:
        return img
    z = 1.0 + drift[0] * (t / drift[1])
    cw, ch = W / z, H / z
    ox, oy = (W - cw) / 2, (H - ch) * 0.7
    return img.crop((int(ox), int(oy), int(ox + cw), int(oy + ch))).resize((W, H), Image.BILINEAR)


def shadow(img, cx, cy, w, a=70):
    s = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(s).ellipse([cx - w / 2, cy - w * 0.07, cx + w / 2, cy + w * 0.07], fill=(60, 72, 40, int(a)))
    img.alpha_composite(s)


def paste_c(img, sprite, cx, bottom, sx=1.0, sy=1.0, flip=False):
    if flip:
        sprite = sprite.transpose(Image.FLIP_LEFT_RIGHT)
    if sx != 1 or sy != 1:
        sprite = sprite.resize((max(1, round(sprite.width * sx)), max(1, round(sprite.height * sy))), Image.BILINEAR)
    img.alpha_composite(sprite, (round(cx - sprite.width / 2), round(bottom - sprite.height)))


def hop(u, n, apex):
    """Progress u (0..1) across n hops -> (lift px, squash 0..0.16, phase in the current hop)."""
    k = u * n
    ph = 0.0 if u >= 1 else k - math.floor(k)
    lift = apex * math.sin(math.pi * ph)
    sq = (0.18 - ph) / 0.18 * 0.16 if ph < 0.18 else ((ph - 0.88) / 0.12 * 0.16 if ph > 0.88 else 0.0)
    return lift, max(sq, 0.0), ph


def speed_lines(img, x, y, direction, a):
    if a <= 0:
        return
    d = ImageDraw.Draw(img, "RGBA")
    for i, (dy, n) in enumerate(((-60, 70), (0, 100), (60, 60))):
        x0 = x - direction * (150 + i * 14)
        d.line([(x0, y + dy), (x0 - direction * n, y + dy + 6)], fill=INK + (int(255 * a),), width=6)


def timer_ring(img, cx, cy, r, frac, a):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(0, 360, 12):  # dashed pencil track
        d.arc([cx - r, cy - r, cx + r, cy + r], i, i + 6, fill=(250, 240, 214, int(110 * a / 255)), width=6)
    if frac > 0:
        end = -90 + 360 * frac
        d.arc([cx - r - 16, cy - r - 16, cx + r + 16, cy + r + 16], -90, end, fill=INK + (a,), width=42)
        d.arc([cx - r - 10, cy - r - 10, cx + r + 10, cy + r + 10], -90, end, fill=(156, 200, 140, a), width=30)
    img.alpha_composite(layer)


# --- characters the meditate storyboard needs (added behind the shared pose API) -------------

def draw_rabbit_sit(P, eyes, lean):  # sits cross-legged facing the viewer; lean: ears blown right, 0..3
    for x, rot in ((41, -12), (59, 12)):
        P.ell(x + lean * 1.5, 18, 6, 19, CREAM, rot=rot + lean * 7)
        P.ell(x + lean * 1.5, 21, 2.8, 13, PINK, rot=rot + lean * 7, hatch=False, w=0)
    P.ell(50, 96, 33, 7, CREAM)
    P.ell(50, 76, 24, 21, CREAM)
    P.ell(50, 82, 11, 8, WHITE, hatch=False)
    P.ell(41, 86, 6, 4.5, CREAM)
    P.ell(59, 86, 6, 4.5, CREAM)
    P.ell(50, 46, 19, 16, CREAM)
    for x in (41, 59):
        P.ell(x - (2 if x < 50 else -2), 53, 3.4, 2.1, mix(CREAM, PINK, 0.6), hatch=False, w=0)
    if eyes:
        P.eye(43, 45, 2.4)
        P.eye(57, 45, 2.4)
    else:
        P.line([(39, 45), (43, 47.5), (47, 45)], w=6)
        P.line([(53, 45), (57, 47.5), (61, 45)], w=6)
    P.ell(50, 51, 2, 1.5, PINK, hatch=False, w=5)
    P.line([(47, 54.5), (50, 56), (53, 54.5)], w=5)


def draw_rock(P):
    P.poly([(4, 96), (8, 74), (22, 60), (44, 54), (68, 56), (88, 66), (97, 84), (96, 98)], (182, 176, 166))
    P.poly([(30, 66), (52, 62), (70, 66), (56, 70)], (214, 210, 200), hatch=False, w=0)


def draw_leaf(P, col):
    P.poly([(10, 50), (34, 34), (66, 36), (90, 50), (66, 64), (34, 66)], col, hatch=False)
    P.line([(16, 50), (82, 50)], w=5)


FILLS = {"ink": INK, "sage": SAGE, "paper": PAPER, "cream": INK, "white": INK}  # light text has no stroke on paper: ink


class Style(Base):
    name = "ink"

    def __init__(self):
        self.A, self.v, self._spr = None, 0, {}

    def assets(self):
        self.A = Assets()
        return self.A

    def _sprite(self, key, fn, h):
        if key not in self._spr:
            self._spr[key] = sprite(fn, h, key[-1])
        return self._spr[key]

    def boil(self, t):
        self.v = int(round(t * FPS) // 3) % BOIL

    # pose API: each returns a sprite to paste bottom-centre
    def rabbit(self, t, wind, eyes):
        lean = min(3, round(3 * wind))
        spr = self._sprite(("rsit", eyes > 0.5, lean, self.v), lambda P: draw_rabbit_sit(P, eyes > 0.5, lean), 380)
        b = (math.sin(t * 2 * math.pi / 3) + 1) / 2  # breath, 3 s cycle
        return spr.resize((spr.width, round(spr.height * (1 + 0.025 * b))), Image.BILINEAR)

    def _friend(self, k, sat, tilt):
        spr = self.A.cast[k][self.v]
        return spr.rotate(-tilt, expand=True, resample=Image.BICUBIC) if sat and tilt else spr

    def fox(self, phase, stride, sat, blink, tilt, wag=0.0, squash=0.0):
        return self._friend(0, sat, tilt)

    def deer(self, phase, stride, sat, blink, tilt, squash=0.0):
        return self._friend(1, sat, tilt)

    def hedgehog(self, phase, stride, sat, blink, tilt, squash=0.0):
        return self._friend(2, sat, tilt)

    def text_line(self, cv, ln, t, a):
        kw = dict(fill=FILLS[ln.get("fill", "ink")], weight=ln.get("weight", "Bold"), shadow=not ln.get("plain"))
        size = ln["size"]
        if "pop" in ln:
            p = back_out(prog(t, *ln["pop"]))
            text_c(cv, ln["s"], ln["y"], size, alpha=int(255 * clamp(p) * a), dy=(1 - clamp(p)) * 60, **kw)
        elif "rise" in ln:
            text_c(cv, ln["s"], ln["y"], size, alpha=int(255 * a), dy=ln["dy"] * (1 - ease_out(prog(t, *ln["rise"]))), **kw)
        else:
            f = ease_out(prog(t, *ln["fade"])) if "fade" in ln else 1.0
            text_c(cv, ln["s"], ln["y"], size, alpha=int(ln.get("peak", 255) * f * a), **kw)

    # scenes
    def scene_title(self, A, sc, tl, t, text=True):
        self.boil(t)
        img = A.paper.copy()
        s = sc.get("sun")
        if s:
            draw_sun(img, s["x"], s["y"], s["r"], tl, int(255 * ease_out(prog(tl, *s["fade"]))))
        if text:
            self.lines(img, sc.get("text", ()), tl)
        return img

    def scene_world(self, A, sc, tl, t, text=True):
        self.boil(t)
        A.v = self.v
        dusk = ease_io(prog(tl, *sc["dusk"])) if "dusk" in sc else 0.0
        s = sc.get("sun", {})
        sun_y = s["y"] + s["sink"] * ease_io(prog(tl, *s["sink_span"])) if "sink" in s else s.get("y", 330)
        cam = sc.get("camera", {})
        img = land_view(A, sc["start"] + tl, dusk, sun_y, (cam["drift"], cam["over"]) if "drift" in cam else None)
        if "timer" in sc:
            self.timer(img, sc["timer"], tl)
        hr = sc["hero"]
        w = gust(t, sc["wind"]) if "wind" in sc else 0.0
        behind = [a for a in sc["cast"].values() if a.get("behind")]
        for a in behind:
            self.actor(img, a, tl)
        if hr["pose"] == "hop":
            self.hops(img, hr, tl)
        elif hr["pose"] == "sit":
            rab = A.rabbit[A.v]
            shadow(img, hr["x"], hr["y"], *hr["shadow"])
            paste_c(img, rab, hr["x"], hr["y"] + hr["bob"][0] * math.sin(tl * hr["bob"][1]), hr["scale"], hr["scale"])
        elif hr["pose"] == "meditate":
            if hr.get("seat") == "rock":
                rock = self._sprite(("rock", 0, self.v), draw_rock, 150)
                paste_c(img, rock, hr["x"], hr["y"] + 70, 2.0, 1.0)
            eyes = prog(t, *hr["eyes"]) * (1 if t < hr["eyes_shut"] else 0)
            paste_c(img, self.rabbit(t, w, eyes), hr["x"], hr["y"] + 10, hr["scale"], hr["scale"])
        else:
            raise Unsupported(f"style ink has no rabbit pose '{hr['pose']}'")
        for a in sc["cast"].values():
            if not a.get("behind"):
                self.actor(img, a, tl)
        if "camera" in sc and "zoom" in cam:
            img = zoom(img, t, cam)
        if "leaves" in sc:
            self.leaves(img, t, sc["leaves"])
        if text:
            self.lines(img, sc.get("text", ()), tl)
        return img

    def hops(self, img, hr, t):
        leg = next((lg for lg in hr["legs"] if t < lg["span"][1]), hr["legs"][-1])
        (a, b), (x0, x1) = leg["span"], leg["x"]
        u = ease_io(prog(t, a, b))
        flip, direction = (True, 1) if x1 > x0 else (False, -1)
        x = x0 + (x1 - x0) * u if x1 > x0 else x0 - (x0 - x1) * u
        ground = hr["ground"]
        lift, sq, ph = hop(u, hr["hops"], hr["apex"])
        p = clamp(back_out(prog(t, *hr["shadow_in"])))
        shadow(img, x, ground + 2, hr["shadow"] * (1 - lift / 450), 80 * p)
        rab = self.A.rabbit[self.A.v]
        speed_lines(img, x, ground - lift - rab.height * 0.5, direction, clamp(1 - abs(ph - 0.3) / 0.22) if 0 < u < 1 else 0)
        paste_c(img, rab, x, ground - lift, 1 + sq, 1 - sq, flip)

    def timer(self, img, tm, t):
        cx = tm["x"]
        ring_a = int(255 * ease_out(prog(t, *tm["fade"])))
        fr = ease_io(prog(t, *tm["fill"]))
        timer_ring(img, cx, tm["y"], tm["r"], fr, ring_a)
        d = ImageDraw.Draw(img, "RGBA")
        tf, s = font(110, "Heavy"), f"{round(tm['minutes'] * fr):02d}:00"
        tw = d.textlength(s, font=tf)
        if ring_a:
            ly = tm["label_y"]
            d.rounded_rectangle([cx - tw / 2 - 40, ly, cx + tw / 2 + 40, ly + 140], radius=40,
                                fill=PAPER + (ring_a,), outline=INK + (ring_a,), width=6)
            d.text((cx - tw / 2, ly + 8), s, font=tf, fill=INK + (ring_a,))

    KINDS = {"fox": 0, "deer": 1, "hedgehog": 2}

    def actor(self, img, a, t):
        if a.get("motion") == "pop":
            p = back_out(prog(t, a["enter"], a["enter"] + 0.45))
            if p > 0:
                sp = self.A.cast[self.KINDS[a["kind"]]][self.A.v]
                shadow(img, a["x"], a["y"] + 2, sp.width * 0.8, 70 * clamp(p))
                paste_c(img, sp, a["x"], a["y"], p, p)
            return
        if t < a["enter"]:  # walk in from x0 and sit down at x1 (enter + dur)
            return
        p = prog(t, a["enter"], a["enter"] + a["dur"])
        x = a["x0"] + (a["x1"] - a["x0"]) * ease_out(p)
        tt = t - (a["enter"] + a["dur"])
        sat = tt >= 0
        tilt = (8 * ease_out(prog(tt, 0.3, 0.9)) + 2 * math.sin(t * 1.7)) if sat else 0.0
        hop_y = 0 if sat else abs(math.sin(t * a.get("gait", 10) * 0.6)) * 26
        spr = getattr(self, a["kind"])(t * a.get("gait", 10), 1.0, sat, False, tilt)
        k = a.get("scale", 1.0)
        sw = a["shadow"][0] if isinstance(a.get("shadow"), tuple) else 260
        shadow(img, x, a["y"], sw * 0.8 * k, 60)
        paste_c(img, spr, x, a["y"] - hop_y, k, k, flip=a["kind"] != "fox" and not a.get("flip", False))

    def leaves(self, img, t, lv):
        cols = (ORANGE, (150, 186, 110), (236, 190, 90), (210, 110, 80))
        for i in range(lv["n"]):
            p = (t - lv["start"] - i * lv["stagger"]) / lv["dur"]
            if not 0 < p < 1:
                continue
            x = -80 + p * (W + 160)
            y = 900 + (i * 97) % 520 + 90 * math.sin(p * 7 + i) - 120 * p
            spr = self._sprite(("leaf", i % 4, self.v), lambda P, c=cols[i % 4]: draw_leaf(P, c), 80)
            spr = spr.rotate(p * 540 + i * 40, expand=True, resample=Image.BICUBIC)
            img.alpha_composite(spr, (round(x - spr.width / 2), round(y - spr.height / 2)))

    def scene_end(self, A, sc, tl, t, text=True):
        self.boil(t)
        t = tl
        img = A.paper.copy()
        s = sc.get("sun")
        if s:
            draw_sun(img, s["x"], s["y"], s["r"], s["clock"] + t)
        m = sc.get("mascot")
        if m:
            spr = self.rabbit(t + m["clock"], m["wind"], 0)
            shadow(img, m["x"], m["y"], m["shadow"][0], 70)
            paste_c(img, spr, m["x"], m["y"], m["scale"], m["scale"])
        ic = sc["icon"]
        size, iy = ic["size"], ic["y"]
        p = clamp(back_out(prog(t, *ic["pop"]), 1.4), 0.01, 1.3)
        n = max(1, round(size * p))
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([W // 2 - size // 2, iy - size // 2 + 40, W // 2 + size // 2, iy + size // 2 + 40],
                                             radius=70, fill=(60, 40, 20, int(80 * clamp(p))))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
        icon = A.icon.resize((n, n), Image.LANCZOS)
        img.alpha_composite(icon, (W // 2 - n // 2, iy - size // 2 + (size - n) // 2 + round(ic["bob"] * math.sin(t * 2))))
        if text:
            self.lines(img, sc.get("text", ()), t)
        return img
