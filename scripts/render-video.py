#!/usr/bin/env python3
"""Render the WildFocus "stop scrolling" clip: 1080x1920, 30 fps, 16 s, silent.

Usage: render-video.py OUT.mp4
       render-video.py --preview DIR T1,T2,...   (PNG stills at those seconds)
Assets are read from ../WildFocus (override with WILDFOCUS_REPO).
Look: cream paper, pencil hatching and a hand-drawn sun, after the Claude ant film.
"""
import math, os, random, subprocess, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

W, H, FPS, DUR = 1080, 1920, 30, 16.0
REPO = os.environ.get("WILDFOCUS_REPO") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "WildFocus")
PAPER, INK, SAGE, SUN = (243, 239, 226), (52, 44, 38), (74, 124, 89), (238, 168, 64)
FONT = "/System/Library/Fonts/SFNSRounded.ttf"


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


def load(rel):
    return Image.open(os.path.join(REPO, rel)).convert("RGBA")


def trim(im, bottom_cut=0.0):
    im = im.crop(im.getbbox())
    if bottom_cut:
        w, h = im.size
        im = im.crop((0, 0, w, int(h * (1 - bottom_cut))))
        fade = Image.new("L", im.size, 255)
        d = ImageDraw.Draw(fade)
        fh = int(im.size[1] * 0.12)
        for i in range(fh):
            y = im.size[1] - fh + i
            d.line([(0, y), (im.size[0], y)], fill=int(255 * (1 - i / fh)))
        im.putalpha(ImageChops.multiply(im.getchannel("A"), fade))
    return im


def fit_h(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


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


def rounded_icon(size):
    im = Image.open(os.path.join(REPO, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")).convert("RGBA")
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.225), fill=255)
    im.putalpha(m.resize((size, size), Image.LANCZOS))
    return im


class Assets:
    def __init__(self):
        self.paper = paper_texture()
        land = load("public/landscape.png")
        land = land.crop((26, 26, land.width - 26, land.height - 26))  # drop the rounded transparent corners
        s = max(W / land.width, H / land.height) * 1.12
        self.land = land.resize((round(land.width * s), round(land.height * s)), Image.LANCZOS).convert("RGB")
        self.rabbit = fit_h(trim(load("src/assets/animals/rabbit.png"), 0.11), 380)
        self.cast = [fit_h(trim(load(f"src/assets/animals/{n}.png"), 0.10), h)
                     for n, h in (("fox", 270), ("deer", 400), ("hedgehog", 230))]
        self.icon = rounded_icon(300)


def land_view(A, t, dim=0.0):
    """Slow push-in on the landscape; dim tints it towards dusk."""
    z = 1.0 + 0.05 * (t / DUR)
    cw, ch = W / z, H / z
    ox, oy = (A.land.width - cw) / 2, (A.land.height - ch) * 0.62
    im = A.land.crop((int(ox), int(oy), int(ox + cw), int(oy + ch))).resize((W, H), Image.BILINEAR).convert("RGBA")
    if dim:
        im = Image.alpha_composite(im, Image.new("RGBA", (W, H), (70, 52, 96, int(150 * dim))))
    return im


def shadow(img, cx, cy, w, a=70):
    s = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(s).ellipse([cx - w / 2, cy - w * 0.09, cx + w / 2, cy + w * 0.09], fill=(30, 40, 20, int(a)))
    img.alpha_composite(s.filter(ImageFilter.GaussianBlur(10)))


def paste_c(img, sprite, cx, bottom, sx=1.0, sy=1.0, flip=False):
    if flip:
        sprite = sprite.transpose(Image.FLIP_LEFT_RIGHT)
    if sx != 1 or sy != 1:
        sprite = sprite.resize((max(1, round(sprite.width * sx)), max(1, round(sprite.height * sy))), Image.BILINEAR)
    img.alpha_composite(sprite, (round(cx - sprite.width / 2), round(bottom - sprite.height)))


def hop(u, n, apex):
    """Progress u (0..1) across n hops -> (lift px, squash 0..0.16)."""
    k = u * n
    ph = 0.0 if u >= 1 else k - math.floor(k)
    lift = apex * math.sin(math.pi * ph)
    sq = (0.18 - ph) / 0.18 * 0.16 if ph < 0.18 else ((ph - 0.88) / 0.12 * 0.16 if ph > 0.88 else 0.0)
    return lift, max(sq, 0.0)


# --- scenes (t is seconds inside the scene) ---------------------------------------------

def scene_hook(A, t):
    img = A.paper.copy()
    draw_sun(img, 820, 330, 110, t, int(255 * ease_out(prog(t, 0.0, 0.6))))
    p = back_out(prog(t, 0.15, 0.85))
    text_c(img, "Stop\nscrolling.", 760, 190, alpha=int(255 * clamp(p)), dy=(1 - clamp(p)) * 60)
    text_c(img, "Breathe. Watch this.", 1290, 64, fill=SAGE, alpha=int(255 * ease_out(prog(t, 1.1, 1.8))),
           weight="Semibold", shadow=False)
    return img


def scene_hops(A, t):
    img = land_view(A, 2.9 + t)
    ground, left, right = 1560, 240, 840
    if t < 3.1:
        u, flip = ease_io(prog(t, 0.0, 3.1)), True
        x = left + (right - left) * u
    else:
        u, flip = ease_io(prog(t, 3.2, 6.3)), False
        x = right - (right - left) * u
    lift, sq = hop(u, 3, 150)
    p = clamp(back_out(prog(t, 0.0, 0.5)))
    shadow(img, x, ground + 4, 250 * (1 - lift / 400), 80 * p)
    paste_c(img, A.rabbit, x, ground - lift, 1 + sq, 1 - sq, flip)
    return img


def timer_ring(img, cx, cy, r, frac, a):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, int(60 * a / 255)), width=14)
    if frac > 0:
        d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * frac, fill=(156, 214, 150, a), width=14)
    img.alpha_composite(layer)


def scene_focus(A, t):
    img = land_view(A, 9.2 + t, ease_io(prog(t, 0.0, 1.0)))
    cx, ground = 540, 1250
    ring_a = int(255 * ease_out(prog(t, 0.3, 0.9)))
    fr = ease_io(prog(t, 0.6, 2.4))
    timer_ring(img, cx, 1050, 330, fr, ring_a)
    d = ImageDraw.Draw(img, "RGBA")
    tf, s = font(120, "Heavy"), f"{round(25 * fr):02d}:00"
    d.text((cx - d.textlength(s, font=tf) / 2, 430), s, font=tf, fill=(255, 255, 255, ring_a))
    shadow(img, cx, ground + 4, 300)
    paste_c(img, A.rabbit, cx, ground + 6 * math.sin(t * 2.4), 1.3, 1.3)
    for sp, fx, fb, t0 in [(A.cast[0], 190, 1450, 2.0), (A.cast[1], 880, 1420, 2.4), (A.cast[2], 520, 1700, 2.8)]:
        p = back_out(prog(t, t0, t0 + 0.45))
        if p > 0:
            shadow(img, fx, fb + 4, sp.width * 0.8, 70 * clamp(p))
            paste_c(img, sp, fx, fb, p, p)
    text_c(img, "25 minutes of focus\nearns you a friend.", 140, 74, fill=(255, 255, 255),
           alpha=int(255 * ease_out(prog(t, 1.2, 1.9))))
    return img


def scene_end(A, t):
    img = A.paper.copy()
    draw_sun(img, 190, 250, 90, 12 + t)
    p = clamp(back_out(prog(t, 0.2, 0.9), 1.4), 0.01, 1.3)
    n = max(1, round(300 * p))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([390, 730, 690, 1030], radius=70, fill=(60, 40, 20, int(80 * clamp(p))))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    ic = A.icon.resize((n, n), Image.LANCZOS)
    img.alpha_composite(ic, (540 - n // 2, 690 + (300 - n) // 2 + round(8 * math.sin(t * 2))))
    text_c(img, "WildFocus", 1100, 120, alpha=int(255 * ease_out(prog(t, 0.8, 1.4))))
    text_c(img, "Free on iOS.", 1260, 78, fill=SAGE, alpha=int(255 * ease_out(prog(t, 1.2, 1.8))),
           weight="Semibold", shadow=False)
    text_c(img, "Phone down. Rabbit up.", 1560, 50, alpha=int(190 * ease_out(prog(t, 1.8, 2.4))),
           weight="Medium", shadow=False)
    return img


SCENES = [(0.0, "hook", scene_hook), (2.9, "hops", scene_hops), (9.2, "focus", scene_focus), (13.0, "end", scene_end)]


def frame(A, t):
    start, _, fn = [s for s in SCENES if s[0] <= t][-1]
    return fn(A, t - start).convert("RGB")


def main():
    A = Assets()
    if sys.argv[1] == "--preview":
        outdir = sys.argv[2]
        os.makedirs(outdir, exist_ok=True)
        for tt in sys.argv[3].split(","):
            frame(A, float(tt)).save(os.path.join(outdir, f"f_{float(tt):05.2f}.png"))
        return
    ff = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-vf", "fade=t=in:st=0:d=0.3,fade=t=out:st=15.6:d=0.4", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", sys.argv[1]], stdin=subprocess.PIPE)
    for i in range(int(DUR * FPS)):
        ff.stdin.write(frame(A, i / FPS).tobytes())
    ff.stdin.close()
    ff.wait()


if __name__ == "__main__":
    main()
