#!/usr/bin/env python3
"""Render the WildFocus "meditating rabbit" clip: 1080x1920, 30 fps, 16 s, synthesised wind + chimes.

Usage: render-meditate.py OUT.mp4
       render-meditate.py --preview DIR T1,T2,...   (PNG stills at those seconds)
Everything is drawn in code except the app icon, read from ../WildFocus (override with WILDFOCUS_REPO).
Look: flat cartoon after The Amazing World of Gumball: thick dark outlines, flat fills, big round shapes.
Beats: 0-3 hook text, 3-9 rabbit meditates (wind gust at ~6 s), 9-13 fox, deer and hedgehog join, 13-16 end card.
"""
import math, os, random, subprocess, sys, tempfile
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 16.0
REPO = os.environ.get("WILDFOCUS_REPO") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "WildFocus")
FONT = "/System/Library/Fonts/SFNSRounded.ttf"
S = 2  # sprite supersampling
OUT, INK, SAGE = (66, 44, 38), (52, 44, 38), (74, 124, 89)
CREAM, WHITE = (255, 246, 226), (255, 252, 246)
FUR, FURS, HOOD, HOODD, PANT = (134, 180, 244), (250, 186, 200), (238, 112, 100), (200, 82, 80), (112, 104, 176)
CHIMES = [(10.6, 659), (11.4, 784), (11.9, 880), (13.45, 659), (13.65, 988)]  # (seconds, Hz): animals settle, icon lands


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, a, b):
    return clamp((t - a) / (b - a))


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_io(x):
    return x * x * (3 - 2 * x)


def back_out(x, s=1.9):
    x -= 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def bez(p0, p1, p2, n=30):
    return [((1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0],
             (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]) for u in (i / (n - 1) for i in range(n))]


def blit(img, im, x, y):
    img.paste(im, (int(x), int(y)), im)


# --- text ------------------------------------------------------------------------------

@lru_cache(maxsize=None)
def text_img(s, size, fill, stroke):
    f = font(size)
    l, t, r, b = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), s, font=f, stroke_width=stroke)
    im = Image.new("RGBA", (r - l + 8, b - t + 8), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((4 - l, 4 - t), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=OUT)
    return im


def put_text(img, s, cy, size, scale=1.0, alpha=1.0, dy=0, fill=CREAM, stroke=12, cx=W / 2):
    im = text_img(s, size, fill, stroke)
    if scale != 1:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    if alpha < 1:
        im = im.copy()
        im.putalpha(im.getchannel("A").point(lambda v: int(v * alpha)))
    blit(img, im, cx - im.width / 2, cy + dy - im.height / 2)


def rounded_icon(size):
    im = Image.open(os.path.join(REPO, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")).convert("RGBA")
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.225), fill=255)
    im.putalpha(m.resize((size, size), Image.LANCZOS))
    return im


# --- cartoon kit: flat fills, thick dark outline outside every shape, painter's order ----

class Cv:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)

    def ell(self, cx, cy, rx, ry, fill, ow=7):
        if ow:
            self.d.ellipse([(cx - rx - ow) * S, (cy - ry - ow) * S, (cx + rx + ow) * S, (cy + ry + ow) * S], fill=OUT)
        self.d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)

    def poly(self, pts, fill, ow=7):
        q = [(x * S, y * S) for x, y in pts]
        if ow:
            self.d.line(q + q[:2], fill=OUT, width=int(2 * ow * S), joint="curve")
        self.d.polygon(q, fill=fill)

    def tube(self, sp, w0, w1, fill, ow=7):
        n = len(sp)
        rs = [(w0 + (w1 - w0) * i / (n - 1)) / 2 for i in range(n)]
        for ring, k in ((OUT, ow), (fill, 0)):
            if ring == OUT and not ow:
                continue
            for (x, y), r in zip(sp, rs):
                self.d.ellipse([(x - r - k) * S, (y - r - k) * S, (x + r + k) * S, (y + r + k) * S], fill=ring)

    def arc(self, box, a0, a1, width=7, fill=OUT):
        x0, y0, x1, y1 = box
        self.d.arc([x0 * S, y0 * S, x1 * S, y1 * S], a0, a1, fill=fill, width=int(width * S))

    def img(self):
        return self.im.resize((self.w, self.h), Image.LANCZOS)


def eye(c, x, y, r=14, look=3):
    c.ell(x, y, r, r * 1.2, WHITE, ow=4)
    c.ell(x + look, y + 2, r * 0.45, r * 0.55, OUT, ow=0)
    c.ell(x + look - 2, y - 2, r * 0.15, r * 0.15, WHITE, ow=0)


# --- characters (each returns (sprite, anchor_x, anchor_y), facing right where it matters) -

def rabbit(t, wind, eyes):
    c = Cv(500, 560)
    b = (math.sin(t * 2 * math.pi / 3) + 1) / 2  # breath, 3 s cycle
    for sx, ph in ((-1, 0.0), (1, 1.7)):
        tipx = 250 + sx * 85 + 20 * wind + (3 + 9 * wind) * math.sin(t * (1.5 + 11 * wind) + ph)
        c.tube(bez((250 + sx * 45, 178), (250 + sx * 88, 95), (tipx, 36)), 60, 46, FUR)
        c.tube(bez((250 + sx * 45, 180), (250 + sx * 86, 105), (tipx, 60)), 34, 22, FURS, ow=0)
    c.ell(170, 497, 105, 44, PANT)
    c.ell(330, 497, 105, 44, PANT)
    c.ell(300, 522, 45, 28, FUR)
    c.ell(200, 522, 45, 28, FUR)
    c.ell(250, 398 - 3 * b, 100 + 3 * b, 112 + 3 * b, HOOD)
    c.poly([(190, 440), (310, 440), (298, 488), (202, 488)], HOODD, ow=5)
    c.ell(250, 322, 92, 36, HOODD)
    for sx in (-1, 1):
        c.tube(bez((250 + sx * 82, 362), (250 + sx * 112, 420), (250 + sx * 134, 470)), 42, 38, HOOD)
        c.ell(250 + sx * 138, 480, 25, 22, FUR)
        c.tube(bez((250 + sx * 28, 345), (250 + sx * 30, 372), (250 + sx * 27 + wind * 6, 392)), 9, 9, CREAM, ow=3)
    c.ell(250, 235, 118, 102, FUR)
    for sx in (-1, 1):
        c.ell(250 + sx * 82, 266, 22, 14, FURS, ow=0)
        if eyes > 0.5:
            eye(c, 250 + sx * 45, 238, 25, 4)
        else:
            c.arc((250 + sx * 45 - 30, 214, 250 + sx * 45 + 30, 258), 25, 155)
    c.ell(250, 266, 15, 10, (240, 130, 150), ow=4)
    c.arc((222, 262, 278, 296), 25, 155, width=6)
    c.poly([(240, 284), (260, 284), (260, 302), (240, 302)], WHITE, ow=4)
    return c.img(), 250, 548


def fox(ph, wag):
    c = Cv(520, 360)
    sw = math.sin(ph) * 24
    FOX, LEG, LEGF = (238, 128, 48), (96, 58, 40), (136, 84, 56)
    for x, dx, col in ((185, -sw, LEGF), (305, -sw, LEGF), (150, sw, LEG), (335, sw, LEG)):
        c.tube(bez((x, 250), (x + dx * 0.5, 292), (x + dx, 330)), 36, 28, col, ow=6)
        c.ell(x + dx + 10, 332, 22, 12, col, ow=6)
    tx = 76 + wag * 14
    c.tube(bez((140, 205), (80, 220), (tx, 118)), 54, 96, FOX)
    c.ell(tx, 104, 34, 36, CREAM)
    c.ell(230, 215, 115, 62, FOX)
    c.ell(262, 244, 66, 26, CREAM, ow=0)
    c.poly([(318, 130), (326, 48), (378, 108)], FOX)
    c.poly([(326, 118), (331, 70), (360, 108)], (150, 70, 40), ow=0)
    c.poly([(362, 112), (396, 44), (414, 130)], FOX)
    c.ell(355, 165, 68, 57, FOX)
    c.poly([(395, 138), (478, 182), (402, 214)], FOX)
    c.poly([(408, 192), (470, 188), (404, 214)], CREAM, ow=0)
    c.ell(476, 182, 14, 12, OUT, ow=0)
    eye(c, 384, 152, 15, 4)
    return c.img(), 260, 350


def deer(ph):
    c = Cv(500, 540)
    sw = math.sin(ph) * 22
    DEER, DEERD, ANT = (206, 146, 86), (150, 100, 60), (120, 80, 48)
    for x, dx, col in ((172, -sw, DEERD), (305, -sw, DEERD), (130, sw, DEERD), (270, sw, DEERD)):
        c.tube(bez((x, 335), (x + dx * 0.5, 428), (x + dx, 515)), 30, 20, col, ow=6)
        c.ell(x + dx + 4, 520, 14, 8, OUT, ow=0)
    c.ell(92, 278, 22, 15, CREAM)
    c.tube(bez((290, 290), (335, 225), (350, 150)), 68, 52, DEER)
    c.ell(215, 300, 120, 64, DEER)
    for x, y in ((170, 275), (215, 262), (250, 292), (190, 318)):
        c.ell(x, y, 9, 7, CREAM, ow=0)
    c.tube(bez((350, 90), (345, 52), (366, 16)), 12, 8, ANT, ow=5)
    c.tube(bez((347, 62), (330, 50), (316, 34)), 9, 7, ANT, ow=4)
    c.tube(bez((354, 44), (374, 38), (392, 22)), 9, 7, ANT, ow=4)
    c.tube(bez((338, 98), (308, 92), (292, 70)), 36, 24, DEER)
    c.tube(bez((336, 98), (310, 92), (298, 76)), 20, 12, FURS, ow=0)
    c.ell(366, 118, 50, 41, DEER)
    c.ell(414, 134, 34, 26, (232, 200, 150))
    c.ell(440, 128, 11, 9, OUT, ow=0)
    eye(c, 380, 108, 14, 4)
    return c.img(), 250, 524


def hedgehog(ph):
    c = Cv(360, 270)
    cx, cy = 150, 168
    pts = []
    for k in range(17):  # spiky dome over the back
        a = math.radians(188 + 164 * k / 16)
        for r in ((142, 1.0), (104, 1.0)) if k < 16 else ((142, 1.0),):
            pts.append((cx + r[0] * math.cos(a) * 1.0, cy + r[0] * math.sin(a) * 0.82))
        if k < 16:
            a2 = math.radians(188 + 164 * (k + 0.5) / 16)
            pts[-1] = (cx + 104 * math.cos(a2), cy + 104 * 0.82 * math.sin(a2))
            pts[-2] = (cx + 142 * math.cos(a), cy + 142 * 0.82 * math.sin(a))
    c.poly(pts + [(cx + 80, cy + 10), (cx - 80, cy + 10)], (90, 64, 50))
    wob = math.sin(ph) * 5
    for x, dx in ((110, -wob), (200, wob)):
        c.ell(x + dx, 242, 26, 14, (70, 50, 40))
    c.ell(cx, cy, 118, 76, (124, 90, 68))
    c.ell(262, 190, 62, 52, (240, 206, 160))
    c.ell(238, 134, 17, 19, (240, 206, 160))
    c.ell(312, 206, 36, 27, (240, 206, 160))
    c.ell(340, 202, 11, 10, OUT, ow=0)
    c.ell(240, 218, 18, 11, FURS, ow=0)
    eye(c, 286, 172, 15, 4)
    return c.img(), 180, 260


def leaf_sprite(col):
    c = Cv(70, 44)
    c.poly([(6, 22), (24, 6), (50, 8), (66, 22), (50, 36), (24, 38)], col, ow=4)
    c.d.line([(10 * S, 22 * S), (58 * S, 22 * S)], fill=OUT, width=3 * S)
    return c.img()


def put(img, spr, ax, ay, wx, wy, sx=1.0, sy=1.0, flip=False):
    if flip:
        spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
        ax = spr.width - ax
    if (sx, sy) != (1.0, 1.0):
        spr = spr.resize((max(1, int(spr.width * sx)), max(1, int(spr.height * sy))), Image.LANCZOS)
    blit(img, spr, wx - ax * sx, wy - ay * sy)


# --- world -----------------------------------------------------------------------------

def hills(d, base, amp, freq, ph, col, bottom):
    d.polygon([(x * S, (base + amp * math.sin(x * freq + ph)) * S) for x in range(0, W + 13, 12)]
              + [(W * S, bottom * S), (0, bottom * S)], fill=col)


def make_bg(kind):
    im = Image.new("RGBA", (W * S, H * S))
    d = ImageDraw.Draw(im)
    top, bot = ((252, 184, 140), (255, 232, 160)) if kind == "meadow" else ((255, 244, 226), (253, 232, 200))
    for y in range(H * S):
        u = min(1, y / (1150 * S))
        d.line([(0, y), (W * S, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * u) for i in range(3)))
    if kind == "meadow":
        halo = Image.new("RGBA", im.size)
        hd = ImageDraw.Draw(halo)
        for r, a in ((330, 40), (250, 60), (190, 90)):
            hd.ellipse([(790 - r) * S, (700 - r) * S, (790 + r) * S, (700 + r) * S], fill=(255, 238, 180, a))
        im.alpha_composite(halo)
        d.ellipse([(790 - 150) * S, (700 - 150) * S, (790 + 150) * S, (700 + 150) * S], fill=(255, 214, 110))
        hills(d, 1010, 55, 0.006, 0.4, (150, 200, 122), H)
        hills(d, 1130, 65, 0.0045, 2.0, (112, 176, 100), H)
        hills(d, 1250, 45, 0.007, 4.1, (86, 150, 86), H)
        d.rectangle([0, 1330 * S, W * S, H * S], fill=(74, 140, 84))
        rnd = random.Random(5)
        for _ in range(14):  # darker swooshes on the lawn
            x, y = rnd.randint(-100, W), rnd.randint(1380, 1900)
            d.ellipse([x * S, y * S, (x + rnd.randint(160, 320)) * S, (y + 22) * S], fill=(64, 124, 76))
        for _ in range(26):
            x, y = rnd.randint(20, W - 20), rnd.randint(1350, 1900)
            col = rnd.choice([(250, 170, 190), (255, 224, 110), (255, 250, 240)])
            d.ellipse([(x - 9) * S, (y - 9) * S, (x + 9) * S, (y + 9) * S], fill=col)
            d.ellipse([(x - 3) * S, (y - 3) * S, (x + 3) * S, (y + 3) * S], fill=(240, 150, 60))
    else:
        hills(d, 1560, 50, 0.005, 0.8, (150, 200, 122), H)
        hills(d, 1650, 45, 0.006, 2.6, (112, 176, 100), H)
        hills(d, 1740, 40, 0.007, 4.5, (86, 150, 86), H)
    return im.resize((W, H), Image.LANCZOS).convert("RGB")


def make_cloud(w):
    c = Cv(w, 130)
    for dx, r in ((0.2, 0.28), (0.4, 0.4), (0.62, 0.34), (0.8, 0.24)):
        c.ell(w * dx, 85 - r * 70, w * r * 0.55, r * 130 * 0.55, (255, 244, 230), ow=0)
    c.ell(w * 0.5, 92, w * 0.36, 26, (255, 244, 230), ow=0)
    return c.img()


class Assets:
    def __init__(self):
        self.bg, self.end_bg = make_bg("meadow"), make_bg("end")
        self.icon = rounded_icon(320)
        r = Cv(440, 186)
        r.ell(220, 124, 205, 55, (150, 142, 160))
        r.ell(220, 102, 190, 60, (190, 184, 200))
        r.ell(170, 82, 60, 20, (210, 206, 220), ow=0)
        self.rock = r.img()
        self.clouds = [(make_cloud(300), 470, 100, 7), (make_cloud(220), 600, 700, 5), (make_cloud(260), 360, 420, 9)]
        self.leaves = [leaf_sprite(c) for c in ((236, 130, 50), (120, 180, 80), (250, 190, 70), (200, 90, 60))]
        rnd = random.Random(11)
        self.tufts = sorted([(rnd.randint(0, W), rnd.randint(1340, 1900), rnd.uniform(0.8, 1.4), rnd.random() * 6) for _ in range(40)],
                            key=lambda p: p[1])
        sh = Image.new("RGBA", (400, 80), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([0, 0, 399, 79], fill=(20, 60, 40, 80))
        self.shadow = sh


def wind(t):
    return 0.12 + 0.88 * math.exp(-(((t - 6.1) / 0.9) ** 2))


def tuft_layer(A, t, front):
    y0 = 1300
    lay = Image.new("RGBA", (W * S, (H - y0) * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for x, y, s, ph in A.tufts:
        if (y >= 1700) != front:
            continue
        sway = (6 + 26 * wind(t)) * math.sin(t * 2.2 + ph)
        for k, (dx, h, col) in enumerate(((-16, 60, (60, 124, 72)), (0, 80, (96, 170, 98)), (16, 56, (60, 124, 72)))):
            h *= s
            pts = [((x + dx - 8 * s) * S, (y - y0) * S), ((x + dx + 8 * s) * S, (y - y0) * S),
                   ((x + dx * 1.6 + sway * h / 60) * S, (y - h - y0) * S)]
            d.polygon(pts, fill=col)
    return lay.resize((W, H - y0), Image.LANCZOS)


def animal(t, t0, dur, x0, x1):
    p = prog(t, t0, t0 + dur)
    x = x0 + (x1 - x0) * ease_out(p)
    moving = 0 < p < 1
    tt = t - (t0 + dur)
    sq = 1 + 0.08 * math.sin(tt * 14) * math.exp(-tt * 5) if tt > 0 else 1.0
    return x, moving, sq


def world(A, t):
    img = A.bg.copy()
    for spr, y, x0, sp in A.clouds:
        blit(img, spr, (x0 + sp * t) % (W + 600) - 300, y)
    blit(img, tuft_layer(A, t, False), 0, 1300)
    w = wind(t)

    dx, dmv, dsq = animal(t, 9.4, 2.0, 1400, 880)
    if t >= 9.4:
        spr, ax, ay = deer(t * 9)
        blit(img, A.shadow.resize((300, 60)), dx - 150, 1490)
        put(img, spr, ax, ay, dx, 1500 - (abs(math.sin(t * 9)) * 8 if dmv else 0), 0.8 * (2 - dsq), 0.8 * dsq, flip=True)

    blit(img, A.rock, 540 - 220, 1480 - 186)
    spr, ax, ay = rabbit(t, w, prog(t, 11.6, 11.8) * (1 if t < 13 else 0))
    put(img, spr, ax, ay, 540, 1420)

    fx, fmv, fsq = animal(t, 9.0, 1.6, -300, 215)
    if t >= 9.0:
        spr, ax, ay = fox(t * 12 if fmv else 0, math.sin(t * 7) if not fmv else 0)
        blit(img, A.shadow.resize((340, 60)), fx - 170, 1530)
        put(img, spr, ax, ay, fx, 1560 - (abs(math.sin(t * 12)) * 8 if fmv else 0), 0.85 * (2 - fsq), 0.85 * fsq)

    hx, hmv, hsq = animal(t, 9.8, 2.1, 1400, 730)
    if t >= 9.8:
        spr, ax, ay = hedgehog(t * 10 if hmv else 0)
        blit(img, A.shadow.resize((260, 50)), hx - 130, 1680)
        put(img, spr, ax, ay, hx, 1700 - (abs(math.sin(t * 10)) * 6 if hmv else 0), 1.0 * (2 - hsq), 1.0 * hsq, flip=True)

    blit(img, tuft_layer(A, t, True), 0, 1300)
    return img


def camera(img, t):
    z = 1.0 + 0.18 * ease_io(prog(t, 2.5, 6.5)) - 0.18 * ease_io(prog(t, 9, 10.8))
    if z == 1.0:
        return img
    cw, ch = W / z, H / z
    ox = clamp(540 - cw / 2, 0, W - cw)
    oy = clamp(1150 - ch / 2, 0, H - ch)
    return img.resize((W, H), Image.BICUBIC, box=(ox, oy, ox + cw, oy + ch))


def leaves(A, img, t):
    for i in range(9):
        t0, p = 5.0 + i * 0.17, (t - 5.0 - i * 0.17) / 2.6
        if not 0 < p < 1:
            continue
        x = -80 + p * (W + 160)
        y = 900 + (i * 97) % 520 + 90 * math.sin(p * 7 + i) - 120 * p
        spr = A.leaves[i % 4].rotate(p * 540 + i * 40, expand=True, resample=Image.BICUBIC)
        sc = 0.8 + (i % 3) * 0.2
        spr = spr.resize((int(spr.width * sc), int(spr.height * sc)), Image.LANCZOS)
        blit(img, spr, x - spr.width / 2, y - spr.height / 2)


def end_card(A, t):
    img = A.end_bg.copy()
    blit(img, A.shadow.resize((340, 70)), 540 - 170, 1775)
    spr, ax, ay = rabbit(t + 20, 0.1, 0)
    put(img, spr, ax, ay, 540, 1800, 0.62, 0.62)
    p = clamp(back_out(prog(t, 0.25, 0.95), 1.4), 0.01, 1.3)
    n = max(1, round(320 * p))
    sh = Image.new("RGBA", (n + 40, n + 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([20, 30, n + 19, n + 29], radius=int(n * 0.225), fill=(60, 40, 20, int(60 * clamp(p))))
    blit(img, sh, 540 - (n + 40) / 2 + 0, 760 - (n + 40) / 2 + 12)
    blit(img, A.icon.resize((n, n), Image.LANCZOS), 540 - n / 2, 760 - n / 2 + round(8 * math.sin(t * 2)))
    put_text(img, "WildFocus", 1040, 124, fill=INK, stroke=0, alpha=ease_out(prog(t, 0.9, 1.5)))
    put_text(img, "Free on iOS.", 1190, 80, fill=SAGE, stroke=0, alpha=ease_out(prog(t, 1.3, 1.9)))
    return img


def frame(A, t):
    if t >= 13.0:
        a = prog(t, 13.0, 13.4)
        card = end_card(A, t - 13.0)
        if a >= 1:
            return card
        return Image.blend(camera(world(A, 12.99), 12.99), card, ease_io(a))
    img = camera(world(A, t), t)
    leaves(A, img, t)
    if t < 3.2:
        a = 1 - prog(t, 2.7, 3.1)
        put_text(img, "Stop scrolling.", 330, 132, scale=clamp(back_out(prog(t, 0.2, 0.8)), 0.01, 1.3), alpha=a * ease_out(prog(t, 0.2, 0.4)))
        put_text(img, "Breathe.", 490, 132, scale=clamp(back_out(prog(t, 1.3, 1.9)), 0.01, 1.3), alpha=a * ease_out(prog(t, 1.3, 1.5)))
    if 9.3 <= t < 13.0:
        a = ease_out(prog(t, 9.3, 9.9)) * (1 - prog(t, 12.7, 13.0))
        put_text(img, "...and make", 300, 112, alpha=a, dy=24 * (1 - ease_out(prog(t, 9.3, 9.9))))
        put_text(img, "a new friend.", 430, 112, alpha=a, dy=24 * (1 - ease_out(prog(t, 9.5, 10.1))))
    return img


# --- audio -----------------------------------------------------------------------------

def make_audio(path):
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"anoisesrc=d={DUR}:c=brown:r=44100:a=0.7",
           "-f", "lavfi", "-i", f"anoisesrc=d={DUR}:c=pink:r=44100:a=0.4"]
    for _ in CHIMES:
        cmd += ["-f", "lavfi", "-i", "sine=f=440:d=1.6:r=44100"]
    fg = ["[0]lowpass=f=450,volume='0.5+0.7*exp(-pow((t-6)/1.4,2))':eval=frame[w]",
          "[1]bandpass=f=1200:width_type=h:w=900,volume='0.02+0.28*exp(-pow((t-6)/0.9,2))':eval=frame[g]"]
    for i, (at, hz) in enumerate(CHIMES):
        ms = int(at * 1000)
        fg.append(f"[{i + 2}]aeval='0.5*sin(2*PI*{hz}*t)+0.15*sin(2*PI*{hz * 2}*t)':c=mono,afade=t=in:d=0.01,"
                  f"afade=t=out:st=0.02:d=1.5:curve=exp,volume=0.5,adelay={ms}|{ms}[c{i}]")
    n = len(CHIMES) + 2
    fg.append("[w][g]" + "".join(f"[c{i}]" for i in range(len(CHIMES))) +
              f"amix=inputs={n}:duration=longest:normalize=0,atrim=0:{DUR},loudnorm=I=-20:TP=-2:LRA=7,aresample=44100,"
              f"afade=t=in:d=0.4,afade=t=out:st={DUR - 0.5}:d=0.5[out]")
    cmd += ["-filter_complex", ";".join(fg), "-map", "[out]", "-ac", "2", path]
    subprocess.run(cmd, check=True)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    A = Assets()
    if sys.argv[1] == "--preview":
        outdir = sys.argv[2]
        os.makedirs(outdir, exist_ok=True)
        for tt in sys.argv[3].split(","):
            frame(A, float(tt)).save(os.path.join(outdir, f"m_{float(tt):05.2f}.png"))
        return
    out = sys.argv[1]
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, "a.wav")
        make_audio(wav)
        ff = subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
             "-i", wav, "-vf", f"fade=t=in:st=0:d=0.3,fade=t=out:st={DUR - 0.4}:d=0.4", "-c:v", "libx264", "-preset", "slow",
             "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out],
            stdin=subprocess.PIPE)
        for i in range(int(DUR * FPS)):
            ff.stdin.write(frame(A, i / FPS).tobytes())
        ff.stdin.close()
        ff.wait()


if __name__ == "__main__":
    main()
