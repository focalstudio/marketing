"""App-art style: the app's own backdrop art as the backdrop and its own animal PNGs as actors, nothing redrawn.

Everything comes from apps/<app>.yml (`assets:`, via kit.brand): assets.backdrop is cover-cropped to 1080x1920 and every
PNG matched by assets.cast is an actor, drawn by file stem ("owl", "snow_leopard", ...). The pose API (rabbit(), fox(), ...)
maps to the PNG of the same name. Sprites are pasted bottom-centre (the feet), `scale` 1 = ACTOR_H px tall.

Storyboard data (scene keys; times are scene-local seconds):
  cast / hero   actors: kind (PNG name), x, y (feet), scale, flip, behind, shadow (False | (w, h, alpha)), bob (idle
                breathing amplitude, 0 = off), freeze=[(t0, t1)] (the motion stops and the actor jitters), and `motion`:
                  pop    enter                                   scale in with overshoot
                  hop    enter, dur, x0, x1, [y0, y1], hops, apex   parabolic arcs, squash on landing
                  slide  enter, dur, x0, x1, [y0, y1]            ease-out glide
                  peek   enter, dur, [ridge, rise]               rises from behind the line y=ridge (default: y, the final feet)
                  (none) with x0: walk in from x0 to x1 and sit (enter, dur, gait); without: stands still
  sky           dusk=(a, b), night=(a, b), horizon: day -> dusk -> night tint;  stars=dict(n, fade=(a, b), y=(y0, y1))
  timer         x, y, size, run=(a, b) or runs=[(a, b), ...], from_ (seconds, default 25:00), fade=(a, b)
  phone         x, y, w, h, buzz=[(a, b), ...], enter, squash: a face-down phone lying on the ground
  counter       x, y, size, steps=[(t, "Day 3/7"), ...]
  leaves        n, start, stagger, dur;  camera: core.zoom;  text: groups of lines (pop / rise / fade, fill, size)
Actors are drawn back to front by y (`behind` ones first), so a phone or an animal in the foreground overlaps correctly.
"""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageOps

from ..kit import brand
from ..kit.core import W, H, zoom
from ..kit.ease import back_out, clamp, ease_io, ease_out, gust, prog
from .base import Style as Base, Unsupported

ACTOR_H = 360
INK, SAGE, WHITE, CREAM = (52, 44, 38), (74, 124, 89), (255, 255, 255), (250, 244, 226)
FILLS = dict(ink=INK, sage=SAGE, white=WHITE, cream=CREAM)
LEAVES = ((226, 140, 60), (150, 186, 110), (236, 190, 90), (210, 110, 80))


def lerp(a, b, u):
    return a + (b - a) * u


def blit(img, spr, x, y):
    """alpha_composite spr at (x, y), clipped to img (alpha_composite itself rejects negative offsets)."""
    x, y = round(x), round(y)
    x0, y0, x1, y1 = max(0, -x), max(0, -y), min(spr.width, img.width - x), min(spr.height, img.height - y)
    if x1 > x0 and y1 > y0:
        img.alpha_composite(spr.crop((x0, y0, x1, y1)), (x + x0, y + y0))


def paste_c(img, spr, cx, bottom, sx=1.0, sy=1.0, flip=False, clip_y=None):
    if flip:
        spr = spr.transpose(Image.FLIP_LEFT_RIGHT)
    if (sx, sy) != (1, 1):
        spr = spr.resize((max(1, round(spr.width * sx)), max(1, round(spr.height * sy))), Image.BILINEAR)
    top = bottom - spr.height
    if clip_y is not None:  # hidden behind a ridge: keep only the rows above clip_y
        keep = int(clip_y - top)
        if keep <= 0:
            return
        spr = spr.crop((0, 0, spr.width, min(spr.height, keep)))
    blit(img, spr, cx - spr.width / 2, top)


def shadow(img, cx, cy, w, h=None, a=70):
    w = max(2, w)
    h = h if h is not None else w * 0.14
    pad = 24
    lay = Image.new("RGBA", (round(w) + 2 * pad, round(h) + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse([pad, pad, pad + w, pad + h], fill=(40, 52, 30, int(a)))
    blit(img, lay.filter(ImageFilter.GaussianBlur(7)), cx - w / 2 - pad, cy - h / 2 - pad)


def hop(u, n, apex):
    """Progress u (0..1) across n hops -> (lift px, squash 0..0.16)."""
    k = u * n
    ph = 0.0 if u >= 1 else k - math.floor(k)
    lift = apex * math.sin(math.pi * ph)
    sq = (0.18 - ph) / 0.18 * 0.16 if ph < 0.18 else ((ph - 0.88) / 0.12 * 0.16 if ph > 0.88 else 0.0)
    return lift, max(sq, 0.0)


def pill(img, cx, cy, s, size, a=1.0, k=1.0):
    """A rounded cream label with `s` in the brand font, centred on (cx, cy)."""
    f = brand.font(size, "Heavy")
    tw = ImageDraw.Draw(Image.new("L", (1, 1))).textlength(s, font=f)
    w, h, pad = round(tw + size * 0.9), round(size * 1.6), 30
    lay = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([pad + 4, pad + 10, pad + w + 4, pad + h + 10], radius=h // 2.6, fill=(30, 30, 20, 70))
    lay = lay.filter(ImageFilter.GaussianBlur(6))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([pad, pad, pad + w, pad + h], radius=h // 2.6, fill=(250, 248, 243, 240), outline=INK + (255,), width=5)
    d.text((pad + w / 2 - tw / 2, pad + h / 2 - size * 0.62), s, font=f, fill=INK + (255,))
    if k != 1.0:
        lay = lay.resize((max(1, round(lay.width * k)), max(1, round(lay.height * k))), Image.BILINEAR)
    if a < 1:
        lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
    blit(img, lay, cx - lay.width / 2, cy - lay.height / 2)


class Assets:
    def __init__(self):
        im = Image.open(brand.asset_path("backdrop")).convert("RGBA")
        row = im.getchannel("A").crop((0, 0, im.width, 1)).getbbox()
        r = (row[0] + 2) if row else 0  # the PNG has transparent rounded corners: crop to the opaque interior
        im = im.crop((r, r, im.width - r, im.height - r))
        self.back = ImageOps.fit(im, (W, H), Image.LANCZOS)
        self.soft = Image.blend(self.back.filter(ImageFilter.GaussianBlur(16)), Image.new("RGBA", (W, H), CREAM + (255,)), 0.45)
        self.icon = brand.rounded_icon(512)
        self.paths = brand.cast_paths()
        self.base, self.masks = {}, {}

    def sprite(self, name):
        if name not in self.base:
            if name not in self.paths:
                raise Unsupported(f"no cast PNG '{name}' (has: {', '.join(self.paths)})")
            im = Image.open(self.paths[name]).convert("RGBA")
            im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
            self.base[name] = im.resize((max(1, round(im.width * ACTOR_H / im.height)), ACTOR_H), Image.LANCZOS)
        return self.base[name]

    def sky_mask(self, horizon):
        if horizon not in self.masks:
            col = Image.new("L", (1, H))
            col.putdata([round(255 * (1 - ease_io(clamp((y - horizon * 0.55) / (horizon * 0.5)))) ) for y in range(H)])
            self.masks[horizon] = col.resize((W, H), Image.NEAREST)
        return self.masks[horizon]


class Style(Base):
    name = "appart"

    def __init__(self):
        self.A = None

    def assets(self):
        self.A = Assets()
        return self.A

    # pose API: every call is the PNG of the same name (the style has no gait, so the clocks only drive breathing)
    def animal(self, name, tilt=0.0, squash=0.0, breath=0.0):
        spr = self.A.sprite(name)
        if breath or squash:
            spr = spr.resize((round(spr.width * (1 + squash)), round(spr.height * (1 + breath - squash))), Image.BILINEAR)
        return spr.rotate(-tilt, expand=True, resample=Image.BICUBIC) if tilt else spr

    def rabbit(self, t, wind, eyes):
        return self.animal("rabbit", breath=0.025 * (math.sin(t * 2 * math.pi / 3) + 1) / 2)

    def fox(self, phase, stride, sat, blink, tilt, wag=0.0, squash=0.0):
        return self.animal("fox", tilt if sat else 0.0, squash)

    def deer(self, phase, stride, sat, blink, tilt, squash=0.0):
        return self.animal("deer", tilt if sat else 0.0, squash)

    def hedgehog(self, phase, stride, sat, blink, tilt, squash=0.0):
        return self.animal("hedgehog", tilt if sat else 0.0, squash)

    def text_line(self, cv, ln, t, a):
        size, f = ln["size"], brand.font(ln["size"], ln.get("weight", "Bold"))
        fill = FILLS[ln.get("fill", "white")]
        dy, al = 0.0, a
        if "pop" in ln:
            p = back_out(prog(t, *ln["pop"]))
            dy, al = (1 - clamp(p)) * 60, a * clamp(p)
        elif "rise" in ln:
            dy = ln["dy"] * (1 - ease_out(prog(t, *ln["rise"])))
        elif "fade" in ln:
            al = a * ease_out(prog(t, *ln["fade"]))
        if al <= 0:
            return
        strip = Image.new("RGBA", (W, round(size * 2.2)), (0, 0, 0, 0))
        d = ImageDraw.Draw(strip)
        tw = d.textlength(ln["s"], font=f)
        x, y = (W - tw) / 2, size * 0.5
        if not ln.get("plain"):
            sh = Image.new("RGBA", strip.size, (0, 0, 0, 0))
            ImageDraw.Draw(sh).text((x, y + size * 0.05), ln["s"], font=f, fill=(20, 40, 50, 120))
            strip.alpha_composite(sh.filter(ImageFilter.GaussianBlur(size * 0.04)))
        d.text((x, y), ln["s"], font=f, fill=fill + (255,))
        strip.putalpha(strip.getchannel("A").point(lambda v: int(v * clamp(al))))
        blit(cv, strip, 0, ln["y"] - size * 0.5 - size * 0.62 + dy)

    # actors
    def actor(self, img, a, t):
        k, kind = a.get("scale", 1.0), a["kind"]
        fr = a.get("freeze", ())
        frozen = any(f0 <= t < f1 for f0, f1 in fr)
        tm = t - sum(max(0.0, min(t, f1) - f0) for f0, f1 in fr)  # motion clock: stands still while frozen
        e = a.get("enter", 0.0)
        if tm < e:
            return
        m = a.get("motion") or ("walk" if "x0" in a else "still")
        x, y, lift, sq, sc, vis, clip, tilt, arrive = a.get("x", 0.0), a["y"], 0.0, 0.0, 1.0, 1.0, None, 0.0, e
        if m == "pop":
            p = back_out(prog(tm, e, e + 0.45))
            sc, vis, arrive = p, clamp(p), e + 0.45
        elif m in ("hop", "slide"):
            arrive = e + a["dur"]
            u = (ease_io if m == "hop" else ease_out)(prog(tm, e, arrive))
            x, y = lerp(a["x0"], a["x1"], u), lerp(a.get("y0", a["y"]), a.get("y1", a["y"]), u)
            if m == "hop":
                lift, sq = hop(u, a["hops"], a["apex"])
        elif m == "peek":
            arrive = e + a["dur"]
            r = ease_out(prog(tm, e, arrive))
            clip = a.get("ridge", a["y"])
            y = a["y"] + (1 - r) * a.get("rise", self.A.sprite(kind).height * k)
            vis = r
        elif m == "walk":  # walk in from x0, then sit and tilt a little (the meditate friends)
            arrive = e + a["dur"]
            x = lerp(a["x0"], a["x1"], ease_out(prog(tm, e, arrive)))
            if tm < arrive:
                lift = abs(math.sin(tm * a.get("gait", 10) * 0.6)) * 26
            else:
                tilt = 8 * ease_out(prog(tm - arrive, 0.3, 0.9)) + 2 * math.sin(t * 1.7)
        breath = 0.0
        if tm >= arrive and not frozen and a.get("bob", 0.02):
            breath = a.get("bob", 0.02) * (math.sin(t * 2 * math.pi / 3 + sum(map(ord, kind)) % 7) + 1) / 2
        if frozen:
            x, y = x + 3 * math.sin(t * 83), y + 2 * math.sin(t * 71 + 1)
        spr = self.animal(kind, tilt, 0.0, breath)
        sh = a.get("shadow", True)
        if sh and vis > 0:
            w, h, al = sh if isinstance(sh, (tuple, list)) else (spr.width * k * 0.8, None, 70)
            shadow(img, x, a["y"] + 2, w * sc * (1 - lift / 450), h, al * vis)
        paste_c(img, spr, x, y - lift, sc * k * (1 + sq), sc * k * (1 - sq), a.get("flip", False), clip)

    # props
    def sky(self, img, sk, tl):
        d, n = ease_io(prog(tl, *sk["dusk"])) if "dusk" in sk else 0.0, ease_io(prog(tl, *sk["night"])) if "night" in sk else 0.0
        if d <= 0 and n <= 0:
            return
        sky_a, gnd_a = 150 * d * (1 - n) + 215 * n, 55 * d * (1 - n) + 95 * n
        mask = self.A.sky_mask(sk.get("horizon", 1000)).point(lambda v: round(gnd_a + (sky_a - gnd_a) * v / 255))
        col = tuple(round(lerp(c0, c1, n)) for c0, c1 in zip((255, 150, 96), (10, 18, 52)))
        lay = Image.new("RGBA", (W, H), col + (0,))
        lay.putalpha(mask)
        img.alpha_composite(lay)

    def stars(self, img, st, tl):
        f = ease_out(prog(tl, *st["fade"]))
        if f <= 0:
            return
        y0, y1 = st.get("y", (60, 900))
        lay = Image.new("RGBA", (W, y1), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for i in range(st["n"]):
            x, y = (i * 389 + 71) % W, y0 + (i * 613 + 211) % max(1, y1 - y0)
            r = 2 + (i * 7) % 4 * 0.9
            al = f * (0.65 + 0.35 * math.sin(tl * 2.4 + i * 1.7))
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 250, 225, int(255 * clamp(al))))
        blit(img, lay, 0, 0)

    def timer(self, img, tm, tl):
        a = ease_out(prog(tl, *tm["fade"])) if "fade" in tm else 1.0
        if a <= 0:
            return
        runs = tm.get("runs") or [tm["run"]]
        r0, r1 = next((r for r in reversed(runs) if r[0] <= tl), runs[0])
        left = round(tm.get("from_", 25 * 60) * (1 - prog(tl, r0, r1)))
        pill(img, tm["x"], tm["y"], f"{left // 60:02d}:{left % 60:02d}", tm.get("size", 110), a)

    def counter(self, img, c, tl):
        cur = [(ts, s) for ts, s in c["steps"] if ts <= tl]
        if cur:
            ts, s = cur[-1]
            pill(img, c["x"], c["y"], s, c.get("size", 96), 1.0, 1 + 0.14 * (1 - clamp(back_out(prog(tl, ts, ts + 0.35)))))

    def phone(self, img, p, tl):
        e = p.get("enter", 0.0)
        if tl < e:
            return
        w, h = p.get("w", 340), p.get("h", 680)
        buzz = next((b for b in p.get("buzz", ()) if b[0] <= tl < b[1]), None)
        pad = 60
        lay = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        rr = int(w * 0.14)
        d.rounded_rectangle([pad, pad, pad + w, pad + h], radius=rr, fill=(36, 38, 46, 255), outline=(96, 100, 112, 255), width=6)
        d.rounded_rectangle([pad + 14, pad + 14, pad + w - 14, pad + h - 14], radius=rr - 10, outline=(52, 55, 66, 255), width=3)
        cx, cy, cr = pad + w * 0.27, pad + h * 0.12, w * 0.15  # the camera bump on the back
        d.rounded_rectangle([cx - cr, cy - cr, cx + cr, cy + cr], radius=cr * 0.5, fill=(26, 28, 34, 255), outline=(84, 88, 100, 255), width=4)
        d.ellipse([cx - cr * 0.45, cy - cr * 0.45, cx + cr * 0.45, cy + cr * 0.45], fill=(12, 14, 20, 255), outline=(70, 74, 86, 255), width=3)
        sq = p.get("squash", 0.42)  # lying on the ground, seen from the front: foreshortened
        lay = lay.resize((lay.width, round(lay.height * sq)), Image.BILINEAR)
        dx = dr = 0.0
        if buzz:
            dx, dr = 4 * math.sin(tl * 95), 2 * math.sin(tl * 61)
            lay = lay.rotate(dr, expand=True, resample=Image.BICUBIC)
        shadow(img, p["x"], p["y"] + 4, w * 1.05, h * sq * 0.35, 90)
        blit(img, lay, p["x"] + dx - lay.width / 2, p["y"] - lay.height + pad * sq * 0.5)
        if buzz:
            arcs = Image.new("RGBA", (W, 400), (0, 0, 0, 0))
            ad = ImageDraw.Draw(arcs)
            for i in range(3):
                ph = (tl * 7 + i / 3) % 1.0
                r = 60 + ph * 90
                al = int(210 * (1 - ph))
                top = 200 - r * 0.6
                for sgn in (-1, 1):
                    ox = p["x"] + sgn * (w / 2 + 30 + ph * 70)
                    ad.arc([ox - r * 0.5, top, ox + r * 0.5, top + r * 1.2], 300 if sgn < 0 else 120, 60 if sgn < 0 else 240, fill=(255, 255, 255, al), width=9)
            blit(img, arcs, 0, p["y"] - h * sq - 200)

    def leaves(self, img, t, lv):
        lay, d = Image.new("RGBA", (W, H), (0, 0, 0, 0)), None
        d = ImageDraw.Draw(lay)
        for i in range(lv["n"]):
            p = (t - lv["start"] - i * lv["stagger"]) / lv["dur"]
            if not 0 < p < 1:
                continue
            x, y, s, ang = -80 + p * (W + 160), 900 + (i * 97) % 520 + 90 * math.sin(p * 7 + i) - 120 * p, 26, p * 9 + i
            pts = [(x + s * math.cos(ang + j * 2.1) * (1.6 if j == 0 else 0.8), y + s * math.sin(ang + j * 2.1) * (1.6 if j == 0 else 0.8)) for j in range(3)]
            d.polygon(pts, fill=LEAVES[i % 4] + (235,))
        img.alpha_composite(lay)

    # scenes
    def scene_title(self, A, sc, tl, t, text=True):
        img = A.soft.copy()
        if text:
            self.lines(img, sc.get("text", ()), tl)
        return img

    def scene_world(self, A, sc, tl, t, text=True):
        self.A = A
        img = A.back.copy()
        if "sky" in sc:
            self.sky(img, sc["sky"], tl)
            if "stars" in sc["sky"]:
                self.stars(img, sc["sky"]["stars"], tl)
        cam = sc.get("camera", {})
        actors = ([sc["hero"]] if "hero" in sc else []) + list(sc.get("cast", {}).values())
        items = [(a["y"], a, "actor") for a in actors if not a.get("behind")]
        if "phone" in sc:
            items.append((sc["phone"]["y"], sc["phone"], "phone"))
        for a in actors:
            if a.get("behind"):
                self.actor(img, a, tl)
        for _, a, kind in sorted(items, key=lambda it: it[0]):
            self.actor(img, a, tl) if kind == "actor" else self.phone(img, a, tl)
        if "timer" in sc:
            self.timer(img, sc["timer"], tl)
        if "counter" in sc:
            self.counter(img, sc["counter"], tl)
        if "zoom" in cam:
            img = zoom(img, t, cam)
        if "leaves" in sc:
            self.leaves(img, t, sc["leaves"])
        if text:
            self.lines(img, sc.get("text", ()), tl)
        return img

    def scene_end(self, A, sc, tl, t, text=True):
        self.A = A
        img = A.soft.copy()
        m = sc.get("mascot")
        if m:
            spr = self.animal(m.get("kind", "rabbit"), breath=0.025 * (math.sin((tl + m.get("clock", 0)) * 2 * math.pi / 3) + 1) / 2)
            shadow(img, m["x"], m["y"], spr.width * m["scale"] * 0.8, None, 70)
            paste_c(img, spr, m["x"], m["y"], m["scale"], m["scale"], m.get("flip", False))
        ic = sc["icon"]
        size, iy = ic["size"], ic["y"]
        p = clamp(back_out(prog(tl, *ic["pop"]), 1.4), 0.01, 1.3)
        n = max(1, round(size * p))
        sh = Image.new("RGBA", (size + 200, size + 200), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([100, 140, 100 + size, 140 + size], radius=70, fill=(60, 40, 20, int(80 * clamp(p))))
        blit(img, sh.filter(ImageFilter.GaussianBlur(26)), W / 2 - size / 2 - 100, iy - size / 2 - 100)
        blit(img, A.icon.resize((n, n), Image.LANCZOS), W / 2 - n / 2, iy - n / 2 + ic["bob"] * math.sin(tl * 2))
        if text:
            self.lines(img, sc.get("text", ()), tl)
        return img
