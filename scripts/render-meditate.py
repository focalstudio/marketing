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

    def shape(self, shapes, fill, ow=7):
        """Merged silhouette: outline every part first, then fill every part, so joins show no seams."""
        for col, e in ((OUT, ow), (fill, 0)) if ow else ((fill, 0),):
            for s in shapes:
                if s[0] == "e":
                    _, cx, cy, rx, ry = s
                    self.d.ellipse([(cx - rx - e) * S, (cy - ry - e) * S, (cx + rx + e) * S, (cy + ry + e) * S], fill=col)
                elif s[0] == "t":
                    _, sp, wf = s
                    for i, (x, y) in enumerate(sp):
                        r = wf(i / (len(sp) - 1)) / 2 + e
                        self.d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=col)

    def arc(self, box, a0, a1, width=7, fill=OUT):
        x0, y0, x1, y1 = box
        self.d.arc([x0 * S, y0 * S, x1 * S, y1 * S], a0, a1, fill=fill, width=int(width * S))

    def img(self):
        return self.im.resize((self.w, self.h), Image.LANCZOS)


def eye(c, x, y, r=14, look=3):
    c.ell(x, y, r, r * 1.2, WHITE, ow=4)
    c.ell(x + look, y + 2, r * 0.48, r * 0.6, OUT, ow=0)
    c.ell(x + look - 2, y - 3, r * 0.17, r * 0.17, WHITE, ow=0)


def lid(c, x, y, r, sx=1):  # closed eye: a thick downward curve with one lash
    c.arc((x - r, y - r * 0.8, x + r, y + r * 0.8), 20, 160, width=7)
    a = math.radians(20 if sx > 0 else 160)
    ex, ey = x + r * math.cos(a), y + r * 0.8 * math.sin(a)
    c.tube(bez((ex, ey), (ex + sx * 5, ey - 4), (ex + sx * 10, ey - 9), 8), 6, 4, OUT, ow=0)


def blinking(t, off=0.0):
    return (t + off) % 3.3 < 0.13


def heart(cx, cy, k):
    return [(cx + k * 16 * math.sin(a) ** 3, cy - k * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)))
            for a in (i / 40 * 2 * math.pi for i in range(40))]


def attach(body, head, pivot, at, ang):
    """Rotate the head sprite about its neck pivot and paste it so the pivot lands on `at`."""
    head = head.rotate(ang, center=pivot, resample=Image.BICUBIC)
    body.alpha_composite(head, (int(at[0] - pivot[0]), int(at[1] - pivot[1])))
    return body


# --- characters (each returns (sprite, anchor_x, anchor_y); animals face right) --------

def rabbit(t, wind, eyes):
    c = Cv(500, 560)
    b = (math.sin(t * 2 * math.pi / 3) + 1) / 2  # breath, 3 s cycle
    for sx, ph in ((-1, 0.0), (1, 1.7)):
        tipx = 250 + sx * 78 + 20 * wind + (3 + 9 * wind) * math.sin(t * (1.5 + 11 * wind) + ph)
        sp = bez((250 + sx * 36, 190), (250 + sx * 82, 112), (tipx, 42))
        c.shape([("t", sp, lambda u: 46 + 18 * math.sin(math.pi * u * 0.92))], FUR)
        c.shape([("t", sp[6:], lambda u: 18 + 12 * math.sin(math.pi * (0.2 + 0.8 * u) * 0.92))], FURS, ow=0)
    c.ell(250, 262, 122, 104, HOOD)  # hood framing the head
    c.ell(250, 500, 150, 40, PANT)
    c.shape([("t", bez((372, 494), (300, 522), (196, 526)), lambda u: 54 - 12 * u)], PANT)  # back shin
    c.ell(182, 528, 34, 20, FUR)
    c.shape([("t", bez((128, 494), (200, 520), (306, 522)), lambda u: 54 - 12 * u)], PANT)  # front shin
    c.ell(322, 522, 34, 20, FUR)
    k = 1 + 0.03 * b
    c.shape([("e", 250, 398, 72 * k, 64 * k), ("e", 250, 446, 96 * k, 60 * k)], HOOD)
    c.ell(250, 344, 64, 18, HOODD)
    for sx in (-1, 1):
        x1 = 250 + sx * 20 + wind * 6
        c.tube(bez((250 + sx * 20, 350), (250 + sx * 23, 372), (x1, 394)), 8, 8, CREAM, ow=3)
        c.ell(x1, 398, 6, 6, CREAM, ow=3)
    for sx in (-1, 1):  # short bent arms, paws together in the lap
        c.shape([("t", bez((250 + sx * 62, 392), (250 + sx * 104, 452), (250 + sx * 34, 470)), lambda u: 40 - 6 * u)], HOOD)
    for sx in (-1, 1):
        c.ell(250 + sx * 19, 472, 24, 19, FUR)
    c.poly([(230, 178), (240, 146), (252, 172), (264, 150), (270, 180)], FUR, ow=5)  # forehead tuft
    c.shape([("e", 250, 250, 100, 86), ("e", 250, 276, 88, 62)], FUR)
    for sx in (-1, 1):
        ex = 250 + sx * 38
        c.ell(250 + sx * 66, 290, 18, 11, FURS, ow=0)
        if eyes > 0.5:
            c.ell(ex, 246, 27, 32, WHITE, ow=6)
            c.ell(ex + sx * -3, 254, 12, 14, OUT, ow=0)
            c.ell(ex + sx * -3 - 4, 248, 4, 4, WHITE, ow=0)
        else:
            lid(c, ex, 252, 24, sx)
        for i, (dx, dy) in enumerate(((44, 292), (54, 298), (46, 304))):
            c.ell(250 + sx * dx, dy, 3, 3, OUT, ow=0)
    c.poly(heart(250, 284, 0.85), (240, 120, 150), ow=4)
    c.arc((234, 284, 252, 304), 20, 160, width=5)
    c.arc((248, 284, 266, 304), 20, 160, width=5)
    c.poly([(242, 302), (249, 302), (249, 313), (242, 313)], WHITE, ow=3)
    c.poly([(251, 302), (258, 302), (258, 313), (251, 313)], WHITE, ow=3)
    return c.img(), 250, 548


FOX, FOXD, SOCK = (238, 128, 48), (204, 100, 42), (74, 48, 40)
DEER, DEERD, DCREAM, ANT = (206, 146, 86), (166, 112, 66), (250, 234, 204), (128, 86, 52)
HOG, SPINE, HFACE = (150, 112, 86), (98, 72, 58), (244, 214, 172)


def fox_head(blink):
    c = Cv(240, 220)
    hx, hy = 100, 130
    c.poly([(hx - 48, hy - 24), (hx - 40, hy - 104), (hx + 2, hy - 46)], FOX)
    c.poly([(hx + 2, hy - 48), (hx + 30, hy - 112), (hx + 48, hy - 34)], FOX)
    c.poly([(hx - 36, hy - 36), (hx - 33, hy - 84), (hx - 12, hy - 50)], SOCK, ow=0)
    c.poly([(hx + 13, hy - 50), (hx + 29, hy - 92), (hx + 37, hy - 44)], SOCK, ow=0)
    c.shape([("e", hx, hy, 62, 54), ("t", bez((hx + 20, hy + 6), (hx + 60, hy + 14), (hx + 98, hy + 22)), lambda u: 60 - 44 * u)], FOX)
    c.ell(hx - 8, hy + 30, 40, 20, CREAM, ow=0)
    c.shape([("t", bez((hx + 30, hy + 24), (hx + 64, hy + 30), (hx + 92, hy + 27)), lambda u: 24 - 14 * u)], CREAM, ow=0)
    c.ell(hx + 100, hy + 20, 11, 9, OUT, ow=0)
    if blink:
        lid(c, hx + 26, hy - 4, 16)
    else:
        eye(c, hx + 26, hy - 8, 17, 5)
    return c.img(), (80, 170)


def fox(ph, sat, blink, tilt, wag):
    c = Cv(480, 380)
    if not sat:
        sw = math.sin(ph) * 20
        legs = [(205, -sw, FOXD), (290, sw, FOXD), (180, sw, FOX), (265, -sw, FOX)]
        for x, dx, col in legs:
            c.shape([("t", bez((x, 262), (x + dx * 0.5, 300), (x + dx, 335)), lambda u: 28 - 4 * u)], col)
            c.shape([("t", bez((x + dx * 0.6, 312), (x + dx * 0.8, 324), (x + dx, 335)), lambda u: 25 - 3 * u)], SOCK, ow=0)
            c.ell(x + dx + 6, 338, 15, 8, SOCK, ow=5)
        tail = bez((152, 240), (90, 236), (76 + wag * 8, 176))
        c.shape([("t", tail, lambda u: 26 + 64 * math.sin(math.pi * u * 0.8))], FOX)
        c.shape([("t", tail[22:], lambda u: 26 + 64 * math.sin(math.pi * (0.73 + 0.27 * u) * 0.8))], CREAM, ow=0)
        c.ell(230, 255, 82, 46, FOX)
        c.ell(245, 282, 50, 14, CREAM, ow=0)
        at = (290, 220)
    else:
        c.ell(196, 340, 32, 9, SOCK, ow=5)
        c.shape([("e", 210, 300, 56, 42), ("e", 255, 258, 52, 64)], FOX)
        c.ell(278, 270, 24, 38, CREAM, ow=0)
        for x in (262, 290):
            c.shape([("t", bez((x, 296), (x, 318), (x + 2, 336)), lambda u: 24)], FOX)
            c.shape([("t", bez((x, 318), (x + 1, 328), (x + 2, 336)), lambda u: 22)], SOCK, ow=0)
            c.ell(x + 6, 339, 14, 7, SOCK, ow=5)
        tail = bez((170, 318), (196, 352), (300 + wag * 6, 342))
        c.shape([("t", tail, lambda u: 24 + 40 * math.sin(math.pi * u * 0.85))], FOX)
        c.shape([("t", tail[21:], lambda u: 24 + 40 * math.sin(math.pi * (0.7 + 0.3 * u) * 0.85))], CREAM, ow=0)
        at = (285, 205)
    head, pv = fox_head(blink)
    return attach(c.img(), head, pv, at, tilt), 230, 346


def deer_head(blink):
    c = Cv(270, 240)
    hx, hy = 140, 140
    for sp in (bez((hx - 30, hy - 30), (hx - 70, hy - 62), (hx - 104, hy - 56)), bez((hx + 18, hy - 38), (hx + 50, hy - 80), (hx + 84, hy - 90))):
        c.shape([("t", sp, lambda u: 14 + 26 * math.sin(math.pi * u))], DEER)
        c.shape([("t", sp[5:-4], lambda u: 6 + 14 * math.sin(math.pi * (0.15 + 0.7 * u)))], FURS, ow=0)
    for sp in (bez((hx - 6, hy - 48), (hx - 9, hy - 62), (hx - 12, hy - 76)), bez((hx + 16, hy - 48), (hx + 18, hy - 60), (hx + 22, hy - 74))):
        c.tube(sp, 14, 11, ANT, ow=5)
    c.shape([("e", hx, hy, 58, 50), ("e", hx + 48, hy + 22, 34, 26)], DEER)
    c.ell(hx + 52, hy + 27, 26, 17, DCREAM, ow=0)
    c.ell(hx + 78, hy + 18, 10, 8, OUT, ow=0)
    if blink:
        lid(c, hx + 16, hy - 2, 17)
    else:
        eye(c, hx + 16, hy - 6, 18, 5)
        c.tube(bez((hx + 32, hy - 22), (hx + 37, hy - 27), (hx + 42, hy - 31), 8), 5, 4, OUT, ow=0)
    return c.img(), (hx - 10, hy + 44)


def deer(ph, sat, blink, tilt):
    c = Cv(480, 470)
    if not sat:
        sw = math.sin(ph) * 18
        for x, dx, col in ((185, -sw, DEERD), (290, sw, DEERD), (160, sw, DEER), (265, -sw, DEER)):
            c.shape([("t", bez((x, 325), (x + dx * 0.5, 380), (x + dx, 428)), lambda u: 22 - 6 * u)], col, ow=6)
            c.ell(x + dx + 2, 432, 11, 7, SOCK, ow=4)
        c.ell(132, 282, 16, 12, DCREAM)
        c.shape([("e", 220, 300, 90, 50), ("t", bez((268, 300), (285, 255), (292, 215)), lambda u: 54 - 10 * u)], DEER)
        for x, y in ((180, 280), (215, 268), (245, 288), (195, 305)):
            c.ell(x, y, 8, 6, DCREAM, ow=0)
        c.ell(292, 288, 20, 26, DCREAM, ow=0)
        at = (292, 215)
    else:
        c.ell(125, 372, 16, 12, DCREAM)
        c.ell(150, 420, 38, 13, DEERD, ow=6)
        c.shape([("e", 215, 385, 92, 46), ("t", bez((266, 380), (284, 336), (290, 300)), lambda u: 54 - 10 * u)], DEER)
        for x, y in ((175, 366), (210, 356), (240, 374), (190, 390)):
            c.ell(x, y, 8, 6, DCREAM, ow=0)
        c.ell(290, 378, 20, 22, DCREAM, ow=0)
        c.ell(300, 420, 42, 13, DEERD, ow=6)
        c.ell(338, 422, 10, 7, SOCK, ow=4)
        at = (290, 300)
    head, pv = deer_head(blink)
    return attach(c.img(), head, pv, at, tilt), 240, 442


def hedgehog(ph, sat, blink, tilt):
    c = Cv(340, 270)
    cx, cy = 150, 170
    pts, n = [(cx, cy + 30)], 13
    for k in range(n):
        for j, (rx, ry) in enumerate(((96, 78), (130, 108))):
            a = math.radians(160 + 170 * (k + 0.5 * j) / n)
            pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    c.poly(pts + [(cx + 96 * math.cos(math.radians(330)), cy + 78 * math.sin(math.radians(330)))], SPINE)
    lift = 0 if sat else math.sin(ph) * 5
    for x, dy in ((118, -max(0, lift)), (190, -max(0, -lift))):
        c.ell(x, 236 + dy, 22, 12, SOCK, ow=5)
    c.ell(cx, cy + 8, 104, 70, HOG)
    for i in range(14):  # spine ticks on the back
        a = math.radians(175 + 150 * (i % 7) / 6)
        r = 0.55 if i < 7 else 0.85
        x, y = cx - 10 + 100 * r * math.cos(a), cy + 10 + 66 * r * math.sin(a)
        c.tube(bez((x, y), (x - 6, y - 5), (x - 12, y - 10), 6), 5, 4, SPINE, ow=0)
    face, pv = Cv(200, 180), (40, 120)
    fx, fy = 70, 90
    face.ell(fx - 18, fy - 46, 14, 15, HFACE, ow=6)
    face.shape([("e", fx, fy, 56, 48), ("t", bez((fx + 18, fy + 10), (fx + 48, fy + 18), (fx + 74, fy + 20)), lambda u: 44 - 24 * u)], HFACE)
    face.ell(fx + 78, fy + 18, 11, 10, OUT, ow=0)
    face.ell(fx + 4, fy + 20, 14, 9, FURS, ow=0)
    if blink:
        lid(face, fx + 8, fy - 8, 15)
    else:
        eye(face, fx + 8, fy - 12, 17, 5)
    return attach(c.img(), face.img(), pv, (202, 216), tilt), 170, 252


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


def friend(t, t0, dur, x0, x1):
    p = prog(t, t0, t0 + dur)
    x = x0 + (x1 - x0) * (1 - (1 - p) ** 2)
    tt = t - (t0 + dur)
    sat = tt >= 0
    sq = 1 + 0.1 * math.sin(tt * 14) * math.exp(-tt * 5) if sat else 1.0
    tilt = (8 * ease_out(prog(tt, 0.3, 0.9)) + 2 * math.sin(t * 1.7)) if sat else 0.0
    bob = 0 if sat else abs(math.sin(t * 11)) * 8
    return x, sat, sq, tilt, bob


def world(A, t):
    img = A.bg.copy()
    for spr, y, x0, sp in A.clouds:
        blit(img, spr, (x0 + sp * t) % (W + 600) - 300, y)
    blit(img, tuft_layer(A, t, False), 0, 1300)
    w = wind(t)

    dx, dsat, dsq, dtilt, dbob = friend(t, 9.4, 2.0, 1400, 880)
    if t >= 9.4:
        spr, ax, ay = deer(t * 10, dsat, blinking(t, 0.9), dtilt)
        blit(img, A.shadow.resize((300, 60)), dx - 150, 1474)
        put(img, spr, ax, ay, dx, 1500 - dbob, 0.8 * (2 - dsq), 0.8 * dsq, flip=True)

    blit(img, A.rock, 540 - 220, 1480 - 186)
    spr, ax, ay = rabbit(t, w, prog(t, 11.6, 11.8) * (1 if t < 13 else 0))
    put(img, spr, ax, ay, 540, 1420)

    fx, fsat, fsq, ftilt, fbob = friend(t, 9.0, 1.6, -300, 215)
    if t >= 9.0:
        spr, ax, ay = fox(t * 12, fsat, blinking(t, 0.0), ftilt, math.sin(t * 5))
        blit(img, A.shadow.resize((340, 60)), fx - 170, 1532)
        put(img, spr, ax, ay, fx, 1560 - fbob, 0.85 * (2 - fsq), 0.85 * fsq)

    hx, hsat, hsq, htilt, hbob = friend(t, 9.8, 2.1, 1400, 730)
    if t >= 9.8:
        spr, ax, ay = hedgehog(t * 12, hsat, blinking(t, 1.9), htilt)
        blit(img, A.shadow.resize((260, 50)), hx - 130, 1676)
        put(img, spr, ax, ay, hx, 1700 - hbob * 0.5, 1.0 * (2 - hsq), 1.0 * hsq, flip=True)

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
