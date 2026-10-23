"""Base of the drawn styles (paper, storybook): the appart storyboard machinery with drawn art instead of the app's PNGs.

appart.Style already plays every storyboard key (actor motions, sky, stars, timer, counter, phone, leaves, the scenes); it
reads art from only three places: A.back, A.soft and A.sprite(name). A drawn style supplies those from video.kit.species:
  backdrop   layers painted once (build), composed per frame with parallax (compose)
  sprite     the animal posed at the actor's clock (joints swing while it moves, ears twitch, it blinks), cached per pose
A subclass sets STEPS (pose steps per second), STROKE (text outline, in sizes) and implements build(), stamp(), tone().
"""
import math, random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from ..kit import brand, species
from ..kit.core import W, H
from ..kit.ease import clamp, ease_out, prog, back_out
from . import appart
from .base import Unsupported

SS = 2  # sprites are drawn at 2x and downsampled
PAD = 120  # layers are this much wider than the frame on each side, for parallax and drift
GRAIN = (236, 255)


def grain(w, h, seed, lo=GRAIN[0], hi=GRAIN[1], cell=4):
    """Soft deterministic paper noise as an RGB image in lo..hi (multiply it over a layer)."""
    cw, ch = max(1, w // cell), max(1, h // cell)
    g = Image.frombytes("L", (cw, ch), random.Random(seed).randbytes(cw * ch)).resize((w, h), Image.BILINEAR)
    g = g.point(lambda v: lo + v * (hi - lo) // 255)
    return Image.merge("RGB", (g, g, g))


def sheet(pts, col, seed, halo=0.5, trees=()):
    """One paper layer: the polygon `pts` (layer coordinates, closed to the bottom edge) in `col`, grained, with a soft
    halo above its top edge so it reads as lying on the layer behind."""
    w = W + 2 * PAD
    mask = Image.new("L", (w, H), 0)
    ImageDraw.Draw(mask).polygon(list(pts) + [(w, H), (0, H)], fill=255)
    rgb = Image.new("RGB", (w, H), col)
    d, dm = ImageDraw.Draw(rgb), ImageDraw.Draw(mask)
    for poly, c in trees:  # trees are cut into the sheet: part of its silhouette, in their own colour
        d.polygon(poly, fill=c)
        dm.polygon(poly, fill=255)
    rgb = ImageChops.multiply(rgb, grain(w, H, seed))
    out = Image.new("RGBA", (w, H), (0, 0, 0, 0))
    if halo:
        hal = Image.new("L", (w, H), 0)
        hal.paste(mask.filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * halo)), (0, -10))
        sh = Image.new("RGBA", (w, H), (24, 34, 28, 0))
        sh.putalpha(hal)
        out.alpha_composite(sh)
    rgb = rgb.convert("RGBA")
    rgb.putalpha(mask)
    out.alpha_composite(rgb)
    return out


class Assets(appart.Assets):
    """appart.Assets' interface (back, soft, icon, sprite, sky_mask), drawn. `clock` and `moving` are set by the actor."""

    def __init__(self, sty):
        self.sty, self.clock, self.moving = sty, 0.0, False
        self.icon = brand.rounded_icon(512)
        self.base, self.masks, self.paths = {}, {}, {}
        self.layers = sty.build()
        self.soft = Image.blend(self.back.filter(ImageFilter.GaussianBlur(16)), Image.new("RGBA", (W, H), appart.CREAM + (255,)), 0.45)

    @property
    def back(self):
        return self.sty.compose(self.layers, self.clock)

    def sprite(self, name):
        if name not in species.SPECIES:
            raise Unsupported(f"no species '{name}' (has: {', '.join(species.SPECIES)})")
        ang = species.pose(name, int(self.clock * self.sty.STEPS) / self.sty.STEPS, self.moving)
        key = (name,) + tuple(round(ang[k]) for k in species.ANGLE_KEYS if k != "blink") + (ang["blink"] < 0.5,)
        if key not in self.base:
            ang = {k: round(v) for k, v in ang.items()} | {"blink": 0.1 if key[-1] else 1.0}
            self.base[key] = self.sty.paint(name, species.parts(name, ang))
        return self.base[key]


class Style(appart.Style):
    name = "drawn"
    STEPS = 24
    STROKE = 0.08

    def assets(self):
        self.A = Assets(self)
        return self.A

    # art hooks
    def build(self):
        raise Unsupported(f"style {self.name} has no backdrop")

    def compose(self, layers, clock):
        """The frame's backdrop: each layer shifted by its depth (parallax sway) and drift (px per second)."""
        img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        for ly in layers:
            dx = ly["depth"] * 16 * math.sin(clock * 0.45 + ly["phase"]) + ly.get("drift", 0.0) * clock
            appart.blit(img, ly["img"], -PAD + dx, 0)
        return img

    def tone(self, col):
        return col

    def stamp(self, cv, xy, col):
        ImageDraw.Draw(cv).polygon(xy, fill=col + (255,))

    def paint(self, name, plist):
        """The posed parts on a canvas that holds all of them (ears, tails and wings that swing past the box are kept),
        centred on the box so the animal never shifts, with its feet (y = 100) on the bottom edge."""
        sp = species.SPECIES[name]
        k, pad = appart.ACTOR_H * SS / 100, 14 * SS
        xs, ys = [x for _, pts in plist for x, _ in pts], [y for _, pts in plist for _, y in pts]
        half = max(sp["w"] / 2 - min(xs), max(xs) - sp["w"] / 2, sp["w"] / 2) * k + pad
        top = min(0.0, min(ys)) * k - pad
        w, h = 2 * math.ceil(half / SS) * SS, math.ceil((100 * k - top) / SS) * SS
        ox, oy = w / 2 - sp["w"] / 2 * k, h - 100 * k
        cv = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        for role, pts in plist:
            self.stamp(cv, [(x * k + ox, y * k + oy) for x, y in pts], self.tone(sp["colors"][role]))
        return cv.resize((cv.width // SS, cv.height // SS), Image.LANCZOS)

    # storyboard
    def actor(self, img, a, t):
        A = self.A
        A.clock = t
        tm = t - sum(max(0.0, min(t, f1) - f0) for f0, f1 in a.get("freeze", ()))  # appart's motion clock
        m = a.get("motion") or ("walk" if "x0" in a else "still")
        e = a.get("enter", 0.0)
        A.moving = m in ("hop", "slide", "walk") and e <= tm < e + a.get("dur", 0.0)
        super().actor(img, a, t)
        A.moving = False

    def scene_title(self, A, sc, tl, t, text=True):
        A.clock = tl
        return super().scene_title(A, sc, tl, t, text)

    def scene_world(self, A, sc, tl, t, text=True):
        A.clock = tl
        return super().scene_world(A, sc, tl, t, text)

    def scene_end(self, A, sc, tl, t, text=True):
        A.clock, A.moving = tl, False
        return super().scene_end(A, sc, tl, t, text)

    def text_line(self, cv, ln, t, a):
        size, f = ln["size"], brand.font(ln["size"], ln.get("weight", "Bold"))
        fill = appart.FILLS[ln.get("fill", "white")]
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
        stroke = 0 if ln.get("plain") else round(size * self.STROKE)
        edge = appart.INK if fill in (appart.WHITE, appart.CREAM) else appart.CREAM
        if stroke:
            sh = Image.new("RGBA", strip.size, (0, 0, 0, 0))
            ImageDraw.Draw(sh).text((x, y + size * 0.06), ln["s"], font=f, fill=(40, 30, 20, 110), stroke_width=stroke)
            strip.alpha_composite(sh.filter(ImageFilter.GaussianBlur(size * 0.04)))
        d.text((x, y), ln["s"], font=f, fill=fill + (255,), stroke_width=stroke, stroke_fill=edge + (255,))
        strip.putalpha(strip.getchannel("A").point(lambda v: int(v * clamp(al))))
        appart.blit(cv, strip, 0, ln["y"] - size * 0.5 - size * 0.62 + dy)
