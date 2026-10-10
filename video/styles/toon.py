"""Toon style: flat cartoon after The Amazing World of Gumball. Thick dark outlines, flat fills, big round shapes.

Characters face right and return (sprite, anchor_x, anchor_y). Drawn at 2x and downsampled.
"""
import math, random
from functools import lru_cache
from PIL import Image, ImageDraw

from ..kit.brand import font, rounded_icon
from ..kit.core import W, H, zoom
from ..kit.ease import back_out, bez, clamp, ease_io, ease_out, gust, prog
from .base import Style as Base

S = 2  # sprite supersampling
OUT, INK, SAGE = (66, 44, 38), (52, 44, 38), (74, 124, 89)
CREAM, WHITE = (255, 246, 226), (255, 252, 246)
FUR, FURS, HOOD, HOODD, PANT = (134, 180, 244), (250, 186, 200), (238, 112, 100), (200, 82, 80), (112, 104, 176)


def blit(img, im, x, y):
    img.paste(im, (int(x), int(y)), im)


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


def tuft_layer(A, t, w, front):
    y0 = 1300
    lay = Image.new("RGBA", (W * S, (H - y0) * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for x, y, s, ph in A.tufts:
        if (y >= 1700) != front:
            continue
        sway = (6 + 26 * w) * math.sin(t * 2.2 + ph)
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


# --- style: the storyboard's scenes drawn with the kit above -------------------------------

FILLS = {"cream": CREAM, "white": WHITE, "ink": INK, "sage": SAGE}


class Style(Base):
    name = "toon"

    def assets(self):
        return Assets()

    # pose API
    def rabbit(self, t, wind, eyes):
        return rabbit(t, wind, eyes)

    def fox(self, phase, stride, sat, blink, tilt, wag=0.0, squash=0.0):
        return fox(phase, sat, blink, tilt, wag)

    def deer(self, phase, stride, sat, blink, tilt, squash=0.0):
        return deer(phase, sat, blink, tilt)

    def hedgehog(self, phase, stride, sat, blink, tilt, squash=0.0):
        return hedgehog(phase, sat, blink, tilt)

    def text_line(self, cv, ln, t, a):
        fill = FILLS[ln.get("fill", "cream")]
        stroke = 0 if ln.get("plain") else 12
        if "pop" in ln:
            put_text(cv, ln["s"], ln["y"], ln["size"], scale=clamp(back_out(prog(t, *ln["pop"])), 0.01, 1.3),
                     alpha=a * ease_out(prog(t, *ln.get("pop_fade", ln["pop"]))), fill=fill, stroke=stroke)
        elif "rise" in ln:
            put_text(cv, ln["s"], ln["y"], ln["size"], alpha=a, dy=ln["dy"] * (1 - ease_out(prog(t, *ln["rise"]))),
                     fill=fill, stroke=stroke)
        else:
            put_text(cv, ln["s"], ln["y"], ln["size"], fill=fill, stroke=stroke,
                     alpha=a * ease_out(prog(t, *ln["fade"])) if "fade" in ln else a)

    # scenes
    def scene_world(self, A, sc, tl, t, text=True):
        img = zoom(self.world(A, sc, t), t, sc["camera"])
        self.leaves(A, img, t, sc["leaves"])
        if text:
            self.lines(img, sc.get("text", ()), tl)
        return img

    def world(self, A, sc, t):
        img = A.bg.copy()
        for spr, y, x0, sp in A.clouds:
            blit(img, spr, (x0 + sp * t) % (W + 600) - 300, y)
        w = gust(t, sc["wind"])
        blit(img, tuft_layer(A, t, w, False), 0, 1300)
        cast = sc["cast"].values()
        for a in cast:
            if a.get("behind"):
                self.actor(A, img, a, t)
        hr = sc["hero"]
        blit(img, A.rock, hr["x"] - 220, hr["y"] + 60 - 186)
        spr, ax, ay = self.rabbit(t, w, prog(t, *hr["eyes"]) * (1 if t < hr["eyes_shut"] else 0))
        if hr["scale"] == 1.0:
            put(img, spr, ax, ay, hr["x"], hr["y"])
        else:
            put(img, spr, ax, ay, hr["x"], hr["y"], hr["scale"], hr["scale"])
        for a in cast:
            if not a.get("behind"):
                self.actor(A, img, a, t)
        blit(img, tuft_layer(A, t, w, True), 0, 1300)
        return img

    def actor(self, A, img, a, t):
        x, sat, sq, tilt, bob = friend(t, a["enter"], a["dur"], a["x0"], a["x1"])
        if t < a["enter"]:
            return
        blink = blinking(t, a["blink"])
        if a["kind"] == "fox":
            spr, ax, ay = self.fox(t * a["gait"], 1.0, sat, blink, tilt, math.sin(t * a.get("wag", 5)))
        else:
            spr, ax, ay = getattr(self, a["kind"])(t * a["gait"], 1.0, sat, blink, tilt)
        sw, sh, sdy = a["shadow"]
        blit(img, A.shadow.resize((sw, sh)), x - sw / 2, a["y"] - sdy)
        k = a["scale"]
        put(img, spr, ax, ay, x, a["y"] - (bob * a["bob"] if "bob" in a else bob), k * (2 - sq), k * sq, flip=a["flip"])

    def leaves(self, A, img, t, lv):
        for i in range(lv["n"]):
            t0, p = lv["start"] + i * lv["stagger"], (t - lv["start"] - i * lv["stagger"]) / lv["dur"]
            if not 0 < p < 1:
                continue
            x = -80 + p * (W + 160)
            y = 900 + (i * 97) % 520 + 90 * math.sin(p * 7 + i) - 120 * p
            spr = A.leaves[i % 4].rotate(p * 540 + i * 40, expand=True, resample=Image.BICUBIC)
            sc = 0.8 + (i % 3) * 0.2
            spr = spr.resize((int(spr.width * sc), int(spr.height * sc)), Image.LANCZOS)
            blit(img, spr, x - spr.width / 2, y - spr.height / 2)

    def scene_end(self, A, sc, tl, t, text=True):
        t = tl
        img = A.end_bg.copy()
        m, ic = sc["mascot"], sc["icon"]
        sw, sh, sdy = m["shadow"]
        blit(img, A.shadow.resize((sw, sh)), m["x"] - sw // 2, m["y"] - sdy)
        spr, ax, ay = self.rabbit(t + m["clock"], m["wind"], 0)
        put(img, spr, ax, ay, m["x"], m["y"], m["scale"], m["scale"])
        p = clamp(back_out(prog(t, *ic["pop"]), 1.4), 0.01, 1.3)
        n = max(1, round(ic["size"] * p))
        sh = Image.new("RGBA", (n + 40, n + 40), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([20, 30, n + 19, n + 29], radius=int(n * 0.225), fill=(60, 40, 20, int(60 * clamp(p))))
        blit(img, sh, W / 2 - (n + 40) / 2 + 0, ic["y"] - (n + 40) / 2 + 12)
        blit(img, A.icon.resize((n, n), Image.LANCZOS), W / 2 - n / 2, ic["y"] - n / 2 + round(ic["bob"] * math.sin(t * 2)))
        if text:
            self.lines(img, sc.get("text", ()), t)
        return img
