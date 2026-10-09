#!/usr/bin/env python3
"""Render the WildFocus "meditating rabbit" clip as 16-bit pixel art: 1080x1920, 30 fps, 16 s, synthesised wind + chimes.

Usage: render-meditate-pixel.py OUT.mp4
       render-meditate-pixel.py --preview DIR T1,T2,...   (PNG stills at those seconds, palette-checked)
Same storyboard and audio as render-meditate.py. Everything is drawn on a 135x240 logical canvas of palette indices
(1px dark outlines, two-shade fills, ordered dithering, no blending) and blown up x8 with NEAREST. The app icon is read
from ../WildFocus (override with WILDFOCUS_REPO) and quantised to the palette.
Character poses step at 10 fps (each pose held 3 video frames); the camera and particles move every frame.
Beats: 0-3 hook text, 3-9 rabbit meditates (wind gust at ~6 s), 9-13 fox, deer and hedgehog join, 13-16 end card.
"""
import math, os, random, subprocess, sys, tempfile
from functools import lru_cache
from PIL import Image, ImageDraw

W, H, FPS, DUR = 1080, 1920, 30, 16.0
LW, LH = 135, 240  # logical canvas, x8 = W x H
REPO = os.environ.get("WILDFOCUS_REPO") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "WildFocus")
CHIMES = [(10.6, 659), (11.4, 784), (11.9, 880), (13.45, 659), (13.65, 988)]  # (seconds, Hz): animals settle, icon lands

# --- palette: every logical pixel is one of these ----------------------------------------
PAL = [0x2e2030, 0xfff8ee, 0xffecca,                      # outline, white, cream
       0xf39a8c, 0xf8b48e, 0xfccf98, 0xffe4ae, 0xffc84c,  # golden-hour sky bands, sun yellow
       0xb6d66e, 0x7cba5c, 0x4e9656, 0x2f6a4a,            # meadow greens (G2 doubles as sage)
       0x8cbaf8, 0x5f82d6, 0xfa9fb6,                      # rabbit fur + shade, pink
       0xf06e5e, 0xbf454f, 0x6f62ac, 0x4a4282,            # hoodie + shade, pants + shade
       0xee8034, 0xa9492b, 0xd6995c, 0x8f5e3d, 0x5c3f35,  # fox orange/dark, deer tan/brown, hedgehog spines
       0xe2c8bc, 0xc89c8c]                                # dusty rose (rock, app icon) + shade
(OUT, WHITE, CREAM, SKY0, SKY1, SKY2, SKY3, SUN, G0, G1, G2, G3, FUR, FURD, PINK,
 HOOD, HOODD, PANT, PANTD, FOX, FOXD, TAN, BROWN, SPINE, ROSE, ROSED) = range(len(PAL))
RGB = [((c >> 16) & 255, (c >> 8) & 255, c & 255) for c in PAL]
FLAT = [v for c in RGB for v in c] + [0] * (768 - 3 * len(RGB))
T = 255  # transparent index (sprites, text overlay)
OPAQUE = bytes(0 if i == T else 255 for i in range(256))
BAYER = ((0, 8, 2, 10), (12, 4, 14, 6), (3, 11, 1, 9), (15, 7, 13, 5))
RIMMABLE = {FUR, FURD, HOOD, HOODD, PANT, PANTD, FOX, FOXD, TAN, BROWN, SPINE}


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


def rounded_icon(size):
    im = Image.open(os.path.join(REPO, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")).convert("RGBA")
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.225), fill=255)
    im.putalpha(m.resize((size, size), Image.LANCZOS))
    return im


def nearest(rgb):
    return min(range(len(RGB)), key=lambda i: sum((a - b) ** 2 for a, b in zip(rgb, RGB[i])))


@lru_cache(maxsize=None)
def icon_px(n):
    """App icon at n x n logical pixels, quantised to the palette: ((x, y, index), ...)."""
    im = rounded_icon(n)
    return tuple((x, y, nearest(px[:3])) for y in range(n) for x in range(n) for px in (im.getpixel((x, y)),) if px[3] >= 170)


# --- sprite kit: pixel masks, auto outline, two-shade fill, rim light ---------------------

def dil(m, diag=False):
    out = set(m)
    nb = ((1, 0), (-1, 0), (0, 1), (0, -1)) + (((1, 1), (1, -1), (-1, 1), (-1, -1)) if diag else ())
    for x, y in m:
        for dx, dy in nb:
            out.add((x + dx, y + dy))
    return out


class Spr:
    """A sprite drawn facing right; flip=True mirrors every primitive so it faces left (lighting stays world-space)."""

    def __init__(self, w, h, flip=False):
        self.w, self.h, self.flip = w, h, flip
        self.a = {}

    def mx(self, x):
        return self.w - 1 - x if self.flip else x

    def ell(self, cx, cy, rx, ry):
        if self.flip:
            cx = self.w - cx
        m = set()
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            v = (y + 0.5 - cy) / ry
            if abs(v) >= 1:
                continue
            hw = rx * math.sqrt(1 - v * v)
            for x in range(int(cx - hw) - 1, int(cx + hw) + 2):
                if abs(x + 0.5 - cx) <= hw:
                    m.add((x, y))
        return m

    def poly(self, pts):
        im = Image.new("1", (self.w, self.h), 0)
        ImageDraw.Draw(im).polygon([(self.mx(x), y) for x, y in pts], fill=1)
        px = im.load()
        return {(x, y) for y in range(self.h) for x in range(self.w) if px[x, y]}

    def limb(self, x0, y0, x1, y1, wd=2):
        m, n = set(), max(1, y1 - y0)
        for y in range(y0, y1 + 1):
            x = round(x0 + (x1 - x0) * (y - y0) / n)
            for k in range(wd):
                m.add((self.mx(x + k), y))
        return m

    def pts(self, pts):
        return {(self.mx(x), y) for x, y in pts}

    def paint(self, m, fill, shade=None, ol=True, sk=1):
        """Fill mask m; outline ring in OUT first (painter's order gives inner outlines); shade the lower-left band."""
        if ol:
            for p in dil(m) - m:
                self.a[p] = OUT
        for p in m:
            self.a[p] = fill
        if shade is not None:
            for x, y in m:
                if (x - sk, y + sk) not in m:
                    self.a[(x, y)] = shade

    def fill(self, m, c):  # sprite-space pixels (e.g. a sub-mask of an ell/poly), no mirroring
        for p in m:
            self.a[p] = c

    def put(self, pts, c):
        for p in self.pts(pts):
            self.a[p] = c

    def rim(self, col, top=False, ymax=1.0):
        """Warm 1px rim on the sun side (upper right): fills whose right (or upper) neighbour is the silhouette edge."""
        sil = set(self.a)

        def edge(x, y):
            return any((x + dx, y + dy) not in sil for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)))
        ys = [y for _, y in sil]
        y0, y1 = min(ys), min(ys) + (max(ys) - min(ys)) * ymax
        xs = [x for x, _ in sil]
        xc = (min(xs) + max(xs)) / 2
        hits = [(x, y) for (x, y), c in self.a.items() if c in RIMMABLE and y <= y1 and
                (edge(x + 1, y) or (top and x >= xc and edge(x, y - 1)))]
        for p in hits:
            self.a[p] = col

    def squash(self):
        """Squash 1px: drop a row ~60% down, duplicate the centre column."""
        ys = [y for _, y in self.a]
        r = min(ys) + int((max(ys) - min(ys)) * 0.6)
        xs = [x for x, _ in self.a]
        cx = (min(xs) + max(xs)) // 2
        out = {}
        for (x, y), c in self.a.items():
            if y == r:
                continue
            ny = y + 1 if y < r else y
            if x >= cx:
                out[(x + 1, ny)] = c
            if x <= cx:
                out[(x, ny)] = c
        self.a = out

    def px(self, ax, ay):
        return tuple((x - ax, y - ay, c) for (x, y), c in self.a.items())


def from_map(rows, legend, mirror=False):
    """Hand-authored pixel map -> pixel dict. mirror=True: rows are the left half incl. the centre column."""
    a = {}
    for y, row in enumerate(rows):
        if mirror:
            row = row + row[-2::-1]
        for x, ch in enumerate(row):
            if ch != ".":
                a[(x, y)] = legend[ch]
    return a


def blit(buf, pix, x, y):
    for dx, dy, c in pix:
        X, Y = x + dx, y + dy
        if 0 <= X < LW and 0 <= Y < LH:
            buf[Y * LW + X] = c


# --- characters (anchor = bottom centre on the ground) ----------------------------------

def ear(s, bx, by, tip_dx, ln):
    m, pink = set(), set()
    for k in range(ln + 1):
        u = k / ln
        c = bx + tip_dx * u * u
        hw = 2.0 if u < 0.78 else (1.5 if u < 0.92 else 1.0)
        for x in range(round(c - hw), round(c + hw)):
            m.add((x, by - k))
        if 0.12 < u < 0.8:
            pink |= {(round(c) - 1, by - k), (round(c), by - k)}
    s.paint(m, FUR, FURD)
    s.put(pink & m, PINK)


@lru_cache(maxsize=None)
def rabbit(b, tipl, tipr, eyes, rim_lv):
    """Front view, cross-legged. b: breath 0..2, tipl/tipr: ear-tip x offsets, eyes: 0 closed / 1 open + smile."""
    s = Spr(44, 64)
    hy = -1 if b >= 1 else 0
    ear(s, 16, 19 + hy, tipl, 17)
    ear(s, 28, 19 + hy, tipr, 17)
    s.paint(s.ell(22, 35 + hy, 10, 4), HOODD)                        # hood bunched behind the neck
    s.paint(s.ell(22, 46, 11 + (b == 2), 10 - (b == 0) * 0.5) | s.poly([(12, 40), (31, 40), (34, 52), (9, 52)]), HOOD, HOODD, sk=2)
    s.put([(x, y) for x in range(17, 27) for y in range(47, 51) if not (y == 50 and x in (17, 26))], HOODD)  # pocket
    for x in (19, 24):                                              # drawstrings with dark aglets
        s.put([(x, y) for y in range(39, 43)], CREAM)
        s.put([(x, 43)], OUT)
    for side in (1, -1):                                            # crossed legs, left shin over right
        s.paint(s.ell(22 + side * 8, 56.5, 10, 4), PANT, PANTD)
    for side in (-1, 1):
        s.paint(s.ell(22 + side * 4.5, 59, 3.5, 2.5), FUR, FURD)    # feet tucked in
        s.put([(22 + side * 4.5 - 0.5 + d, 60) for d in (-1, 0)], PINK)
    for side in (-1, 1):                                            # sleeves down the sides, forearms into the lap
        arm = s.poly([(13, 38 - (b == 2)), (9, 41), (8, 47), (11, 51), (19, 52), (19, 48), (13, 46), (14, 41)])
        if side > 0:
            arm = {(43 - x, y) for x, y in arm}
        s.paint(arm, HOOD, HOODD)
        s.paint(s.ell(22 + side * 3, 50.5, 3, 2.2), FUR, FURD)
    s.paint(s.ell(22, 26 + hy, 13, 10.5), FUR, FURD, sk=2)          # head
    y = 27 + hy
    if eyes:
        for ex in (15, 27):
            s.put([(ex, y - 1), (ex + 1, y - 1), (ex, y), (ex + 1, y), (ex, y + 1), (ex + 1, y + 1)], OUT)
            s.put([(ex + 1, y - 1)], WHITE)
        s.put([(19, y + 3), (20, y + 4), (21, y + 4), (22, y + 4), (23, y + 4), (24, y + 3)], OUT)
        s.put([(21, y + 5), (22, y + 5)], PINK)
    else:
        for ex in (14, 26):
            s.put([(ex, y), (ex + 1, y + 1), (ex + 2, y + 1), (ex + 3, y)], OUT)
        s.put([(20, y + 3), (21, y + 4), (22, y + 4), (23, y + 3)], OUT)
    s.put([(21, y + 2), (22, y + 2)], PINK)                            # nose
    s.put([(11, y + 2), (12, y + 2), (31, y + 2), (32, y + 2)], PINK)  # blush
    s.rim(WHITE if rim_lv else SKY3, top=bool(rim_lv), ymax=0.8)
    return s.px(22, 61)


def fox_head(s, hx, hy, blink):
    s.paint(s.poly([(hx - 4, hy - 2), (hx - 3, hy - 8), (hx, hy - 4)]), FOX)
    s.paint(s.poly([(hx - 1, hy - 3), (hx + 1, hy - 9), (hx + 3, hy - 3)]), FOX)
    s.put([(hx + 1, hy - 6), (hx + 1, hy - 5), (hx, hy - 4), (hx + 2, hy - 4)], FOXD)
    head = s.ell(hx + 0.5, hy + 0.5, 4.5, 4) | s.poly([(hx + 2, hy - 1), (hx + 8, hy + 1), (hx + 8, hy + 2), (hx + 2, hy + 4)])
    s.paint(head, FOX, FOXD)
    s.put([(x, y) for x in range(hx - 2, hx + 9) for y in range(hy + 2, hy + 6)
           if (s.mx(x), y) in head and y >= hy + 2 + (x < hx)], CREAM)                # cheek + lower jaw
    s.put([(hx + 8, hy + 1), (hx + 8, hy + 2)], OUT)
    if blink:
        s.put([(hx + 2, hy + 1), (hx + 3, hy + 1)], OUT)
    else:
        s.put([(hx + 3, hy - 1), (hx + 3, hy), (hx + 3, hy + 1)], OUT)


@lru_cache(maxsize=None)
def fox(pose, f, blink, wag, rim_lv, squash):
    """Side view facing right. pose 'walk' (f = 0..3) or 'sit'."""
    s = Spr(38, 32)
    g = 29
    if pose == "walk":
        bob = f % 2
        sw = (2, 0, -2, 0)[f]
        for x, dx in ((10, sw), (21, -sw)):
            s.paint(s.limb(x, 18 - bob, x + dx, g), FOXD)
        tail = s.ell(7, 15 - bob, 3, 2.5) | s.ell(5, 12 - bob, 3.5, 3) | s.ell(3.5, 9 - bob, 3, 3)
        s.paint(tail, FOX, FOXD)
        s.fill(s.ell(3, 7.5 - bob, 2.5, 2.2) & tail, CREAM)
        for x, dx in ((8, -sw), (19, sw)):
            leg = s.limb(x, 18 - bob, x + dx, g)
            s.paint(leg, FOX)
            s.put([(x + dx + k, y) for y in (g - 1, g) for k in (0, 1)], FOXD)
        body = s.ell(15, 16 - bob, 8.5, 4.5)
        s.paint(body, FOX, FOXD)
        s.fill(s.ell(16, 19 - bob, 5.5, 1.8) & body, CREAM)
        fox_head(s, 24, 10 - bob, blink)
    else:
        s.paint(s.limb(15, 20, 15, g), FOXD)
        haunch = s.ell(11, 22, 6.5, 6) | s.ell(17, 18, 4.5, 7)
        s.paint(haunch, FOX, FOXD)
        s.fill(s.ell(19, 18, 2.2, 4.5) & haunch, CREAM)
        s.paint(s.limb(18, 21, 18, g), FOX)
        s.put([(18, g), (19, g), (18, g - 1), (19, g - 1)], FOXD)
        s.paint(s.ell(11, g - 0.5, 4, 1.8), FOX, FOXD)
        tail = s.ell(8, g - 1.5, 6.5, 2.5) | s.ell(15 + wag, g - 0.5, 5, 2)
        s.paint(tail, FOX, FOXD)
        s.fill(s.ell(20 + wag, g - 0.5, 2.5, 1.8) & tail, CREAM)
        fox_head(s, 21, 8, blink)
    if squash:
        s.squash()
    s.rim(WHITE if rim_lv else SKY3, top=bool(rim_lv), ymax=0.85)
    return s.px(15, g + 1)


def deer_head(s, hx, hy, blink):
    s.paint(s.poly([(hx - 2, hy - 1), (hx - 7, hy - 4), (hx - 7, hy - 2), (hx - 3, hy + 1)]), TAN)
    s.put([(hx - 5, hy - 2), (hx - 4, hy - 1)], PINK)
    s.paint(s.ell(hx + 0.5, hy + 0.5, 3.5, 3) | s.ell(hx + 4, hy + 2, 2.5, 1.8), TAN, BROWN)
    s.put([(hx + 4, hy + 3), (hx + 5, hy + 3), (hx + 3, hy + 3)], CREAM)
    s.put([(hx + 6, hy + 1), (hx + 6, hy + 2)], OUT)
    s.put([(hx + 2, hy + 1), (hx + 3, hy + 1)] if blink else [(hx + 2, hy - 1), (hx + 2, hy), (hx + 2, hy + 1)], OUT)


@lru_cache(maxsize=None)
def deer(pose, f, blink, rim_lv, squash, flip=True):
    """Spotted fawn, side view (faces left by default). pose 'walk' (f = 0..3) or 'sit' (lying, legs tucked)."""
    s = Spr(34, 38, flip)
    g = 35
    if pose == "walk":
        bob = f % 2
        sw = (2, 0, -2, 0)[f]
        for x, dx in ((9, sw), (20, -sw)):
            s.paint(s.limb(x, 20 - bob, x + dx, g), BROWN)
        s.paint(s.ell(4, 15 - bob, 2, 2), CREAM)
        for x, dx in ((7, -sw), (18, sw)):
            s.paint(s.limb(x, 20 - bob, x + dx, g), TAN)
            s.put([(x + dx, g), (x + dx + 1, g)], SPINE)
        neck = s.poly([(17, 15 - bob), (20, 8 - bob), (24, 9 - bob), (22, 17 - bob)])
        body = s.ell(12.5, 18 - bob, 9, 4.5)
        s.paint(body | neck, TAN, BROWN)
        s.fill(s.ell(13, 21 - bob, 6, 1.6) & body, CREAM)
        s.put([(9, 15 - bob), (12, 14 - bob), (15, 15 - bob), (11, 17 - bob), (7, 17 - bob)], CREAM)
        deer_head(s, 22, 7 - bob, blink)
    else:
        s.paint(s.ell(4, 28, 2, 2), CREAM)
        neck = s.poly([(17, 27), (19, 19), (23, 20), (22, 29)])
        body = s.ell(12.5, 30, 9.5, 4.5)
        s.paint(body | neck, TAN, BROWN)
        s.put([(9, 27), (12, 26), (15, 27), (11, 29), (7, 29)], CREAM)
        s.paint(s.ell(20, g - 0.5, 4, 1.6), TAN, BROWN)
        s.put([(23, g), (24, g)], SPINE)
        s.paint(s.ell(6, g - 0.5, 3.5, 1.6), TAN, BROWN)
        deer_head(s, 21, 18, blink)
    if squash:
        s.squash()
    s.rim(WHITE if rim_lv else SKY3, top=bool(rim_lv), ymax=0.85)
    return s.px(s.mx(14), g + 1)


@lru_cache(maxsize=None)
def hedgehog(f, blink, rim_lv, squash, flip=True):
    """Side view (faces left by default); f = 0..3 walk frames, f = -1 sitting."""
    s = Spr(28, 18, flip)
    g = 15
    bob = f % 2 if f >= 0 else 0
    sw = (1, 0, -1, 0)[f] if f >= 0 else 0
    for x, dx in ((7, -sw), (16, sw)):
        s.paint(s.limb(x, g - 2, x + dx, g), BROWN)
    s.paint(s.ell(13, 11 - bob, 7, 3.5), TAN, BROWN)
    dome = s.ell(10.5, 9 - bob, 8.5, 6)
    xs = sorted({x for x, _ in dome})
    for x in xs:
        top = min(y for xx, y in dome if xx == x)
        if (x - xs[0]) % 2 == 0 and s.mx(x) < 15:
            dome.add((x, top - 1))
    ys = sorted({y for _, y in dome})
    for y in ys:
        if y % 2 == 0 and y < 13 - bob:
            side = [x for x, yy in dome if yy == y]
            dome.add((min(side) - 1, y) if not s.flip else (max(side) + 1, y))
    s.paint(dome, SPINE, ol=True)
    for x, y in dome:  # lighter quill streaks
        if (x + 2 * y) % 5 == 0:
            s.a[(x, y)] = BROWN
    face = s.ell(17.5, 10.5 - bob, 3.5, 3) | s.poly([(18, 9 - bob), (23, 11 - bob), (18, 13 - bob)])
    s.paint(face, CREAM, TAN)
    s.paint(s.ell(16.5, 7.5 - bob, 1.3, 1.3), TAN)
    s.put([(23, 10 - bob), (23, 11 - bob)], OUT)
    s.put([(19, 11 - bob), (20, 11 - bob)] if blink else [(20, 9 - bob), (20, 10 - bob)], OUT)
    s.put([(21, 12 - bob)], PINK)
    if squash:
        s.squash()
    s.rim(WHITE if rim_lv else SKY3, top=bool(rim_lv), ymax=0.9)
    return s.px(s.mx(13), g + 1)


MINI = ("...ff....", "...fpf...", "...fpf...", "...fpf...", "...Fpf...", "...Fpf...",
        "....fffff", "..fffffff", ".ffffffff", ".ffoffoff", ".fpfooffp", "..fffffof", "....fffff",
        "...hhhhch", "..hhhhhch", ".hhhhhhhh", ".Hhhhffhh", "nnnnnnnnn", "Nnnnnffnn", ".NNNNNNNN")


@lru_cache(maxsize=None)
def mini_rabbit(b):
    s = Spr(21, 26)
    a = from_map(MINI, {"f": FUR, "F": FURD, "p": PINK, "o": OUT, "h": HOOD, "H": HOODD, "c": CREAM, "n": PANT, "N": PANTD},
                 mirror=True)
    if b:  # breathe in: head and ears rise 1px
        a = {(x, y - 1 if y <= 12 else y): c for (x, y), c in a.items()} | {(x, 12): c for (x, y), c in a.items() if y == 12}
    a = {(x + 1, y + 2): c for (x, y), c in a.items()}
    m = set(a)
    s.a = {p: OUT for p in dil(m) - m} | a
    s.rim(SKY3, ymax=0.8)
    return s.px(9, 22)


# --- bitmap font: 5x7 caps, digits, punctuation ----------------------------------------

_G = """
A .###. #...# #...# ##### #...# #...# #...#
B ####. #...# #...# ####. #...# #...# ####.
C .###. #...# #.... #.... #.... #...# .###.
D ####. #...# #...# #...# #...# #...# ####.
E ##### #.... #.... ####. #.... #.... #####
F ##### #.... #.... ####. #.... #.... #....
G .###. #...# #.... #.### #...# #...# .####
H #...# #...# #...# ##### #...# #...# #...#
I ### .#. .#. .#. .#. .#. ###
J ..### ...#. ...#. ...#. #..#. #..#. .##..
K #...# #..#. #.#.. ##... #.#.. #..#. #...#
L #.... #.... #.... #.... #.... #.... #####
M #...# ##.## #.#.# #.#.# #...# #...# #...#
N #...# ##..# #.#.# #..## #...# #...# #...#
O .###. #...# #...# #...# #...# #...# .###.
P ####. #...# #...# ####. #.... #.... #....
Q .###. #...# #...# #...# #.#.# #..#. .##.#
R ####. #...# #...# ####. #.#.. #..#. #...#
S .#### #.... #.... .###. ....# ....# ####.
T ##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
U #...# #...# #...# #...# #...# #...# .###.
V #...# #...# #...# #...# #...# .#.#. ..#..
W #...# #...# #...# #.#.# #.#.# ##.## #...#
X #...# #...# .#.#. ..#.. .#.#. #...# #...#
Y #...# #...# .#.#. ..#.. ..#.. ..#.. ..#..
Z ##### ....# ...#. ..#.. .#... #.... #####
0 .###. #...# #..## #.#.# ##..# #...# .###.
1 ..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.
2 .###. #...# ....# ...#. ..#.. .#... #####
3 ####. ....# ....# .###. ....# ....# ####.
4 ...#. ..##. .#.#. #..#. ##### ...#. ...#.
5 ##### #.... ####. ....# ....# #...# .###.
6 .###. #.... #.... ####. #...# #...# .###.
7 ##### ....# ...#. ..#.. .#... .#... .#...
8 .###. #...# #...# .###. #...# #...# .###.
9 .###. #...# #...# .#### ....# ....# .###.
i . # . # # # #
. . . . . . . #
! # # # # # . #
, . . . . . # #
' # # . . . . .
- ... ... ... ### ... ... ...
_ . . . . . . .
"""
FONT = {ln[0]: tuple(ln[2:].split()) for ln in _G.strip().splitlines()}
FONT[" "] = FONT.pop("_")


def draw_text(buf, s, cy, scale, fill, t=None, t0=0.0, alpha=1.0, dy=0, stagger=0.035):
    """Centre s on row cy: integer-scaled glyphs, 1px dark outline + drop shadow. With t, letters drop in one by one
    from t0 (back-out bounce); alpha < 1 dissolves through the Bayer matrix (no blending)."""
    if alpha <= 0:
        return
    scale, sy_ = scale if isinstance(scale, tuple) else (scale, scale)  # integer (x, y) factors
    widths = [len(FONT[ch][0]) * scale for ch in s]
    gap = next(g for g in (scale + 1, scale, 1, 0) if sum(widths) + g * (len(s) - 1) + 2 <= LW or g == 0)
    x = (LW - sum(widths) - gap * (len(s) - 1)) // 2
    fill_px = set()
    for i, ch in enumerate(s):
        ddy = dy
        q = 1.0 if t is None else prog(t, t0 + i * stagger, t0 + i * stagger + 0.3)
        if q > 0:
            ddy += round(-7 * (1 - back_out(q)))
            y0 = cy - (7 * sy_) // 2 + ddy
            for r, row in enumerate(FONT[ch]):
                for c, v in enumerate(row):
                    if v == "#":
                        fill_px |= {(x + c * scale + sx, y0 + r * sy_ + sy) for sx in range(scale) for sy in range(sy_)}
        x += widths[i] + gap
    ring = dil(fill_px, diag=True) - fill_px
    shadow = {(px, py + 1) for px, py in ring} - ring - fill_px
    for pts, col in ((shadow, OUT), (ring, OUT), (fill_px, fill)):
        for px, py in pts:
            if 0 <= px < LW and 0 <= py < LH and (alpha >= 1 or BAYER[py & 3][px & 3] < alpha * 16):
                buf[py * LW + px] = col


# --- world -----------------------------------------------------------------------------

def sky_band(x, y, bands, edges, fade=8):
    k = sum(1 for e in edges if y >= e)
    if k < len(edges):
        lvl = (y - (edges[k] - fade) + 0.5) / fade
        if lvl > 0 and BAYER[y & 3][x & 3] < lvl * 16:
            return bands[k + 1]
    return bands[k]


def hill_tops(base, amp, f1, ph, amp2=0.0, f2=0.0):
    return [round(base + amp * math.sin(x * f1 + ph) + amp2 * math.sin(x * f2 + ph * 1.7)) for x in range(LW)]


def make_meadow():
    a = bytearray(LW * LH)
    for y in range(LH):
        for x in range(LW):
            a[y * LW + x] = sky_band(x, y, (SKY0, SKY1, SKY2, SKY3), (34, 68, 100))
    sx, sy = 101, 90
    for y in range(sy - 22, sy + 22):  # sun with dithered halo
        for x in range(sx - 22, min(LW, sx + 22)):
            d = math.hypot(x + 0.5 - sx, y + 0.5 - sy)
            i = y * LW + x
            if d < 11.5:
                a[i] = SUN
            elif d < 15.5:
                a[i] = SKY3 if (x + y) % 2 else a[i]
            elif d < 20.5 and BAYER[y & 3][x & 3] < 4:
                a[i] = SKY3
    layers = [(hill_tops(124, 4, 0.05, 0.4, 2, 0.15), G0, SKY3), (hill_tops(136, 6, 0.04, 2.0, 1.5, 0.11), G1, G0),
              (hill_tops(150, 4, 0.07, 4.1, 1, 0.2), G2, G1)]
    for k, (tops, col, lit) in enumerate(layers):
        for x in range(LW):
            for y in range(tops[x], LH):
                a[y * LW + x] = col
            if k:
                a[tops[x] * LW + x] = lit
                if (x % 2) == 0:
                    a[(tops[x] + 1) * LW + x] = lit
    for x in range(LW):
        for y in range(160, LH):
            a[y * LW + x] = G1
    for tx in (6, 13, 19, 44, 113, 121, 128):  # little round trees on the middle hill
        ty = layers[1][0][tx] + 1
        s = Spr(9, 10)
        s.paint(s.pts([(4, 7), (4, 8), (4, 9)]), BROWN, ol=False)
        s.paint(s.ell(4.5, 4.5, 3.5, 4) if tx % 2 else s.ell(4.5, 5, 3, 3.5), G2, G3, ol=False)
        s.put([(5, 2), (6, 3)], G1)
        blit(a, s.px(4, 9), tx, ty)
    rnd = random.Random(5)
    for _ in range(90):  # lawn texture: dark grass ticks and lit specks
        x, y = rnd.randrange(LW), rnd.randrange(163, LH)
        a[y * LW + x] = G2
        if rnd.random() < 0.5 and y > 163:
            a[(y - 1) * LW + x + (1 if x < LW - 1 else 0)] = G2
    for _ in range(40):
        x, y = rnd.randrange(LW), rnd.randrange(164, LH)
        a[y * LW + x] = G0
    for x, y in ((8, 222), (22, 234), (46, 226), (60, 236), (84, 231), (118, 224), (128, 236), (104, 238), (36, 212),
                 (126, 206), (5, 200), (115, 199)):
        petal = WHITE if (x + y) % 3 else PINK
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if 0 <= x + dx < LW and 0 <= y + dy < LH:
                a[(y + dy) * LW + x + dx] = petal
        a[y * LW + x] = SUN
    s = Spr(46, 16)  # rock (with its shadow) under the rabbit
    s.paint(s.ell(23, 12.5, 21, 3), G2, ol=False)
    s.paint(s.ell(23, 8, 19, 6.5), ROSE, ROSED, sk=2)
    s.put([(30, 3), (31, 3), (32, 3), (34, 4), (35, 4), (36, 5)], CREAM)
    s.put([(10, 4), (11, 4), (12, 3), (13, 3), (9, 5), (14, 3)], G1)
    s.put([(11, 3), (13, 2)], G0)
    blit(a, s.px(23, 2), 68, 181)
    return a


def make_card_bg():
    a = bytearray(LW * LH)
    for y in range(LH):
        for x in range(LW):
            a[y * LW + x] = sky_band(x, y, (CREAM, SKY3, SKY2), (150, 190), fade=12)
    for tops, col, lit in ((hill_tops(206, 3, 0.05, 0.8, 1, 0.13), G0, CREAM), (hill_tops(216, 3, 0.06, 2.6), G1, G0),
                           (hill_tops(228, 3, 0.07, 4.5), G2, G1)):
        for x in range(LW):
            for y in range(tops[x], LH):
                a[y * LW + x] = col
            a[tops[x] * LW + x] = lit
    return a


def wind(t):
    return 0.12 + 0.88 * math.exp(-(((t - 6.1) / 0.9) ** 2))


def make_tufts():
    rnd = random.Random(11)
    tufts = [(rnd.randrange(2, LW - 2), rnd.randrange(166, LH + 2), rnd.randint(4, 7), rnd.random() * 6) for _ in range(46)]
    return sorted(tufts, key=lambda p: p[1])


def draw_tufts(buf, tufts, tp, front):
    w = wind(tp)
    for x, y, h, ph in tufts:
        if (y >= 203) != front:
            continue
        lean = (0.5 + 3.4 * w) * (0.7 + 0.3 * math.sin(tp * 3 + ph))
        for dx, hb, col, tip in ((-1, h - 2, G2, G2), (1, h - 1, G2, G1), (0, h, G2, G0)):
            for k in range(hb):
                px, py = x + dx + round(lean * ((k + 1) / hb) ** 2), y - k
                if 0 <= px < LW and 0 <= py < LH:
                    buf[py * LW + px] = tip if k >= hb - 2 else (G3 if k == 0 else col)


# --- particles: one preallocated pool, stepped once per video frame ---------------------

LEAF_FRAMES = (("..aa", ".aaa", "aad.", "d..."), (".aaa.", "aaaaa", ".ddd."), ("aa", "aa", "ad", ".d"),
               ("aa..", "aaa.", ".daa", "...d"))
LEAF_PX = []
for _rows in LEAF_FRAMES:  # (dx, dy, part): 0 = leaf colour, 1 = darker vein/stem, 2 = outline
    _m = {(x, y): int(ch == "d") for y, r in enumerate(_rows) for x, ch in enumerate(r) if ch != "."}
    LEAF_PX.append(tuple((x, y, 2) for x, y in dil(set(_m)) - set(_m)) + tuple((x, y, k) for (x, y), k in _m.items()))
LEAF_COLS = ((FOX, FOXD), (SUN, FOX), (G0, G2), (HOOD, HOODD))
SETTLE = {"fox": 10.6, "deer": 11.4, "hog": 11.9}
SPARK_EVENTS = [(10.6, 30, 176, 10), (11.4, 108, 160, 10), (11.9, 92, 201, 9), (11.7, 68, 132, 7), (13.45, 68, 82, 14)]
ALIVE, KIND, PX_, PY_, VX, VY, AGE, LIFE, Y0, PH, COL = range(11)


class Pool:
    N = 96

    def __init__(self):
        self.ps = [[False, 0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0] for _ in range(self.N)]
        self.rnd = random.Random(42)
        self.acc = 0.0
        self.fi = -1

    def spawn(self, kind, x, y, vx, vy, life, ph=0.0, col=0):
        for p in self.ps:
            if not p[ALIVE]:
                p[ALIVE], p[KIND], p[PX_], p[PY_], p[VX], p[VY] = True, kind, x, y, vx, vy
                p[AGE], p[LIFE], p[Y0], p[PH], p[COL] = 0, life, y, ph, col
                return

    def step_to(self, fi):
        while self.fi < fi:
            self.fi += 1
            self.step(self.fi / FPS)

    def step(self, t):
        rnd = self.rnd
        if 4.9 <= t <= 7.6:
            self.acc += 1.1 * wind(t) ** 1.5
            while self.acc >= 1:
                self.acc -= 1
                self.spawn(0, -4.0, rnd.uniform(92, 206), rnd.uniform(1.5, 2.6), rnd.uniform(-0.12, -0.02), 150,
                           rnd.uniform(0, 6.3), rnd.randrange(len(LEAF_COLS)))
            if rnd.random() < 0.5 * wind(t) ** 2:  # wind streaks
                self.spawn(2, -10.0, rnd.uniform(14, 215), rnd.uniform(5, 7.5), 0.0, 40, 0.0, rnd.randint(4, 8))
        for at, x, y, n in SPARK_EVENTS:
            if round(at * FPS) == round(t * FPS):
                for k in range(n):
                    ang = 2 * math.pi * (k + rnd.uniform(-0.3, 0.3)) / n
                    sp = rnd.uniform(1.0, 1.8)
                    self.spawn(1, x, y, sp * math.cos(ang), sp * math.sin(ang) - 0.4, rnd.randint(14, 22))
        w = wind(t)
        for p in self.ps:
            if not p[ALIVE]:
                continue
            p[AGE] += 1
            if p[KIND] == 0:
                p[PX_] += p[VX] * (0.9 + 0.5 * w)
                p[Y0] += p[VY]
                p[PY_] = p[Y0] + 4.5 * math.sin(p[AGE] * 0.16 + p[PH])
                if p[PX_] > LW + 4:
                    p[ALIVE] = False
            elif p[KIND] == 2:
                p[PX_] += p[VX]
                if p[PX_] > LW + 2:
                    p[ALIVE] = False
            else:
                p[PX_] += p[VX]
                p[PY_] += p[VY]
                p[VX] *= 0.88
                p[VY] = p[VY] * 0.88 + 0.03
            if p[AGE] >= p[LIFE]:
                p[ALIVE] = False

    def draw(self, buf, kinds=(0, 1, 2), dark=G2):
        for p in self.ps:
            if not p[ALIVE] or p[KIND] not in kinds:
                continue
            x, y, left = round(p[PX_]), round(p[PY_]), p[LIFE] - p[AGE]
            if p[KIND] == 0:
                main, dark = LEAF_COLS[p[COL]]
                if left < 6:  # decays white -> accent -> dark before despawn
                    main = (HOODD, SUN, WHITE)[min(2, left // 2)]
                cols = (main, dark, OUT)
                for dx, dy, k in LEAF_PX[(p[AGE] // 3 + int(p[PH] * 3)) % 4]:
                    if 0 <= x + dx < LW and 0 <= y + dy < LH:
                        buf[(y + dy) * LW + x + dx] = cols[k]
            elif p[KIND] == 2:
                for dx in range(p[COL]):
                    if 0 <= x - dx < LW:
                        buf[y * LW + x - dx] = WHITE if dx < p[COL] // 2 else CREAM
            else:
                u = p[AGE] / p[LIFE]
                col = WHITE if u < 0.3 else SUN if u < 0.55 else PINK if u < 0.8 else dark
                pts = ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)) if u < 0.55 else ((0, 0),)
                for dx, dy in pts:
                    if 0 <= x + dx < LW and 0 <= y + dy < LH:
                        buf[(y + dy) * LW + x + dx] = col


# --- scene -----------------------------------------------------------------------------

class Assets:
    def __init__(self):
        self.bg, self.card_bg, self.tufts = make_meadow(), make_card_bg(), make_tufts()
        self.clouds = []
        for w, h, seed in ((26, 9, 1), (18, 7, 2), (22, 8, 3)):
            s, r = Spr(w + 2, h + 2), random.Random(seed)
            m = set()
            for k in range(4):
                m |= s.ell(3 + k * (w - 6) / 3 + r.uniform(-1, 1), h - 2 - (2.5 if 0 < k < 3 else 0.5), w / 5.5, h / 2.4)
            m = {(x, y) for x, y in m if y <= h - 1}
            s.paint(m, CREAM, ol=False)
            for x, y in m:
                if (x, y + 1) not in m:
                    s.a[(x, y)] = SKY3
            self.clouds.append(s.px(0, 0))


def pose_t(t):
    return math.floor(t * 10 + 1e-6) / 10  # pixel-animation clock: 10 fps, each pose held 3 frames


def walker(t, tp, t0, settle, x0, x1):
    """(x, pose, frame, squash) for an animal that walks in from x0 and plops down at x1 at `settle` seconds."""
    p = prog(t, t0, settle)
    x = round(x0 + (x1 - x0) * (0.55 * p + 0.45 * ease_out(p)))
    if t < settle:
        return x, "walk", int(round(tp * 10)) % 4, False
    return x, "sit", 0, tp < settle + 0.2


def rim_level(tp, w):
    return int(w > 0.5 or any(0 <= tp - s < 0.4 for s in SETTLE.values()) or 11.7 <= tp < 12.1)


def world(A, t, pool):
    tp = pose_t(t)
    w = wind(tp)
    a = bytearray(A.bg)
    for spr, y, x0, sp in zip(A.clouds, (26, 52, 12), (10, 74, 108), (1.6, 1.1, 2.0)):
        blit(a, spr, round((x0 + sp * t) % (LW + 40)) - 30, y)
    draw_tufts(a, A.tufts, tp, False)
    rl = rim_level(tp, w)
    blink = lambda off: (int(round(tp * 10)) + off) % 27 == 0

    if t >= 9.4:
        x, pose, f, sq = walker(t, tp, 9.4, SETTLE["deer"], 160, 110)
        _shadow(a, x, 188, 10)
        blit(a, deer(pose, f, pose == "sit" and blink(5), rl if pose == "sit" else 0, sq), x, 188)

    tipw = round(2.4 * w)
    fl = (0.3 + 1.7 * w)
    eyes = 1 if 11.7 <= t < 13.2 else 0
    b = (math.sin(tp * 2 * math.pi / 3 - math.pi / 2) + 1) / 2
    blit(a, rabbit(0 if b < 0.3 else 1 if b < 0.7 else 2, -2 + tipw + round(fl * math.sin(tp * (2 + 9 * w))),
                   2 + tipw + round(fl * math.sin(tp * (2 + 9 * w) + 1.7)), eyes, rl), 68, 183)

    if t >= 9.0:
        x, pose, f, sq = walker(t, tp, 9.0, SETTLE["fox"], -20, 28)
        _shadow(a, x, 197, 11)
        blit(a, fox(pose, f, pose == "sit" and blink(0), (int(round(tp * 10)) // 4) % 2 if pose == "sit" else 0,
                    rl if pose == "sit" else 0, sq), x, 197)
    if t >= 9.8:
        x, pose, f, sq = walker(t, tp, 9.8, SETTLE["hog"], 150, 92)
        _shadow(a, x, 212, 8)
        blit(a, hedgehog(f if pose == "walk" else -1, pose == "sit" and blink(11), rl if pose == "sit" else 0, sq), x, 212)

    draw_tufts(a, A.tufts, tp, True)
    pool.draw(a)
    return a


def _shadow(a, cx, gy, rx):
    for dx in range(-rx, rx + 1):
        for dy in (0, 1) if abs(dx) < rx - 2 else (0,):
            X, Y = cx + dx, gy + dy
            if 0 <= X < LW and 0 <= Y < LH and a[Y * LW + X] in (G1, G0):
                a[Y * LW + X] = G2


def camera(t):
    """Pixel-snapped crop (x, y, w, h) of the logical canvas, or None at 1x."""
    z = 1.0 + 0.25 * ease_io(prog(t, 3.0, 6.5)) - 0.25 * ease_io(prog(t, 9.0, 10.8))
    cw = round(LW / z)
    if cw >= LW:
        return None
    ch = round(cw * LH / LW)
    ox = round(clamp(68 - cw / 2, 0, LW - cw))
    oy = round(clamp(152 - ch / 2, 0, LH - ch))
    return ox, oy, ox + cw, oy + ch


def end_card(A, tc, pool):
    tp = pose_t(tc)
    a = bytearray(A.card_bg)
    blit(a, mini_rabbit(int((math.sin(tp * 2 * math.pi / 3) + 1) / 2 > 0.5)), 68, 216)
    p = clamp(back_out(prog(tc, 0.25, 0.95), 1.4), 0, 1.3)
    n = round(56 * p)
    if n >= 2:
        y0 = 84 - n // 2 + round(1.2 * math.sin(tp * 2))
        x0 = 68 - n // 2
        ic = icon_px(n)  # only the footprint is used, for the pixel-art drop shadow; the real logo is overlaid in to_rgb
        blit(a, tuple((x, y + 3, ROSED) for x, y, _ in ic), x0, y0)
    draw_text(a, "WILDFOCUS", 134, (2, 3), WHITE, t=tc, t0=0.9, stagger=0.025)
    draw_text(a, "FREE ON iOS.", 158, 2, G2, t=tc, t0=1.3, stagger=0.02)
    pool.draw(a, kinds=(1,), dark=ROSED)
    return a


def logo(tc):
    """The exact app icon, composited at full output resolution (never pixelated): (size_px, cx, cy) or None."""
    tp = pose_t(tc)
    n = round(56 * 8 * clamp(back_out(prog(tc, 0.25, 0.95), 1.4), 0, 1.3))
    if n < 16:
        return None
    return n, 68 * 8, 84 * 8 + round(1.2 * math.sin(tp * 2) * 8)


def frame(A, t, pool):
    """-> (logical canvas, camera crop or None, text overlay or None, logo spec or None)"""
    if t >= 13.0:
        card = end_card(A, t - 13.0, pool)
        u = prog(t, 13.0, 13.4)
        lg = logo(t - 13.0)
        if u >= 1:
            return card, None, None, lg
        wd = world(A, t, pool)  # camera is back to 1x by now: dissolve through the Bayer matrix
        lvl = ease_io(u) * 16
        for y in range(LH):
            row = BAYER[y & 3]
            for x in range(LW):
                if row[x & 3] < lvl:
                    wd[y * LW + x] = card[y * LW + x]
        return wd, None, None, lg
    ov = None
    if t < 3.2 or 9.3 <= t < 13.0:
        ov = bytearray([T]) * (LW * LH)
        if t < 3.2:
            a = 1 - prog(t, 2.7, 3.1)
            draw_text(ov, "STOP", 30, 2, WHITE, t=t, t0=0.2, alpha=a)
            draw_text(ov, "SCROLLING.", 48, 2, WHITE, t=t, t0=0.3, alpha=a, stagger=0.03)
            draw_text(ov, "BREATHE.", 74, 2, CREAM, t=t, t0=1.3, alpha=a)
        else:
            a = ease_out(prog(t, 9.3, 9.7)) * (1 - prog(t, 12.7, 13.0))
            draw_text(ov, "...AND MAKE", 30, 2, CREAM, alpha=a, dy=round(4 * (1 - ease_out(prog(t, 9.3, 9.8)))))
            draw_text(ov, "A NEW FRIEND.", 48, 2, WHITE, alpha=a, dy=round(4 * (1 - ease_out(prog(t, 9.5, 10.0)))))
    return world(A, t, pool), camera(t), ov, None


def to_rgb(canvas, crop, ov, lg=None):
    im = Image.frombytes("P", (LW, LH), bytes(canvas))
    im.putpalette(FLAT)
    im = im.convert("RGB").resize((W, H), Image.NEAREST, box=crop)
    if ov is not None:
        o = Image.frombytes("P", (LW, LH), bytes(ov))
        o.putpalette(FLAT)
        m = Image.frombytes("L", (LW, LH), bytes(ov).translate(OPAQUE))
        im.paste(o.convert("RGB").resize((W, H), Image.NEAREST), (0, 0), m.resize((W, H), Image.NEAREST))
    if lg is not None:
        n, cx, cy = lg
        ic = rounded_icon(n)
        im.paste(ic, (cx - n // 2, cy - n // 2), ic)
    return im


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


def check_palette(canvas, ov, im):
    assert max(canvas) < len(PAL), "logical canvas holds a non-palette index"
    assert ov is None or all(v == T or v < len(PAL) for v in ov), "text overlay holds a non-palette index"
    stray = {c for _, c in im.getcolors(1 << 16)} - set(RGB)
    assert not stray, f"non-palette colours in output: {sorted(stray)[:5]}"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    A = Assets()
    if sys.argv[1] == "--preview":
        outdir = sys.argv[2]
        os.makedirs(outdir, exist_ok=True)
        for tt in sys.argv[3].split(","):
            pool = Pool()
            pool.step_to(round(float(tt) * FPS))
            canvas, crop, ov, lg = frame(A, float(tt), pool)
            im = to_rgb(canvas, crop, ov)  # palette check runs before the logo overlay: the logo is deliberately exact
            check_palette(canvas, ov, im)
            if lg is not None:
                im = to_rgb(canvas, crop, ov, lg)
            im.save(os.path.join(outdir, f"p_{float(tt):05.2f}.png"))
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
        pool = Pool()
        for i in range(int(DUR * FPS)):
            pool.step_to(i)
            ff.stdin.write(to_rgb(*frame(A, i / FPS, pool)).tobytes())
        ff.stdin.close()
        ff.wait()


if __name__ == "__main__":
    main()
