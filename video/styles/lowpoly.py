"""Low-poly style: the app's origami animals in 2D.

Every shape is a small triangle mesh with a pseudo-3D height per vertex; each facet is flat-shaded from its normal
against a fixed upper-left light, plus a little per-facet jitter, so the parts read as folded paper. No outlines.
Characters are mesh item lists placed with an affine transform (aff/root) and rasterised with stamp().
"""
import math, random
from functools import lru_cache
from PIL import Image, ImageDraw

from ..kit.brand import font, rounded_icon
from ..kit.core import W, H, zoom
from ..kit.ease import back_out, bez, clamp, ease_io, ease_out, gust, prog
from .base import Style as Base

S = 2  # supersampling for every mesh draw
OUT, INK, SAGE = (66, 44, 38), (52, 44, 38), (74, 124, 89)
CREAM, WHITE = (255, 246, 226), (255, 252, 246)


def lerp(a, b, u):
    return a + (b - a) * u


def lerpp(p, q, u):
    return (lerp(p[0], q[0], u), lerp(p[1], q[1], u))


def blit(img, im, x, y):
    img.paste(im, (int(round(x)), int(round(y))), im)


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


_l = math.sqrt(0.5 ** 2 + 0.7 ** 2 + 0.85 ** 2)
LX, LY, LZ = -0.5 / _l, -0.7 / _l, 0.85 / _l  # light from the upper left, toward the viewer
LIGHT = (255, 247, 228)


def tone(col, k):
    if k >= 1:  # lit facets drift toward warm light rather than blowing out
        u = min(0.7, (k - 1) * 1.6)
        return (int(col[0] + (LIGHT[0] - col[0]) * u), int(col[1] + (LIGHT[1] - col[1]) * u), int(col[2] + (LIGHT[2] - col[2]) * u))
    return (int(col[0] * k), int(col[1] * k), int(min(255, col[2] * (k + (1 - k) * 0.3))))  # cool, slightly violet shade


def mulc(col, k):
    return tuple(int(clamp(c * k, 0, 255)) for c in col)


def ell_pts(cx, cy, rx, ry, n=12, a0=-90.0, rot=0.0):
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    out = []
    for i in range(n):
        a = math.radians(a0 + 360.0 * i / n)
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * cr - y * sr, cy + x * sr + y * cr))
    return out


def _outline_at(pts, f):
    n = len(pts)
    i = int(math.floor(f))
    return lerpp(pts[i % n], pts[(i + 1) % n], f - i)


def blob(pts, col, depth=None, rings=(0.66, 0.32), seed=0, jit=0.05, zf=0.1, center=None, wob=0.06, flat=False):
    """Dome mesh inside a closed outline: staggered rings toward the centre, heights follow a sphere profile."""
    rnd = random.Random(seed)
    n = len(pts)
    C = center or (sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n)
    R = sum(math.hypot(p[0] - C[0], p[1] - C[1]) for p in pts) / n
    dep = 0.55 * R if depth is None else depth
    rows = [[(x, y, dep * zf) for x, y in pts]]
    for k, f in enumerate(rings, 1):
        z = dep * max(zf, math.sqrt(1 - f * f))
        row = []
        for i in range(n):
            q = _outline_at(pts, i + k * 0.5)
            row.append((C[0] + (q[0] - C[0]) * f + rnd.uniform(-wob, wob) * R * f,
                        C[1] + (q[1] - C[1]) * f + rnd.uniform(-wob, wob) * R * f, z * (1 + rnd.uniform(-0.08, 0.08))))
        rows.append(row)
    m = []

    def add(a, b, c):
        cx, cy = (a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3
        m.append((*a, *b, *c, col(cx, cy) if callable(col) else col, None if flat else rnd.uniform(-jit, jit)))

    for A, B in zip(rows, rows[1:]):
        for i in range(n):
            j = (i + 1) % n
            add(A[i], A[j], B[i])
            add(B[i], A[j], B[j])
    last, c3 = rows[-1], (C[0], C[1], dep)
    for i in range(n):
        add(last[i], last[(i + 1) % n], c3)
    return m
SIDES = (-1.0, -0.42, 0.28, 1.0)


def tube(sp, widths, col, depth=0.5, seed=0, jit=0.05, zf=0.12, cap=True, cap0=False, flat=False):
    """Ridged ribbon along a spine: three facets across, alternating diagonals, optional rounded end caps."""
    rnd = random.Random(seed)
    n = len(sp)
    if len(widths) != n:
        widths = [lerp(widths[int(u)], widths[min(len(widths) - 1, int(u) + 1)], u - int(u))
                  for u in (i * (len(widths) - 1) / (n - 1) for i in range(n))]
    rows, tans = [], []
    for k, (x, y) in enumerate(sp):
        a, b = sp[max(0, k - 1)], sp[min(n - 1, k + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        l = math.hypot(tx, ty) or 1
        tx, ty = tx / l, ty / l
        tans.append((tx, ty))
        w = widths[k] / 2
        row = []
        for s in SIDES:
            s2 = s if abs(s) == 1 else s + rnd.uniform(-0.12, 0.12)
            row.append((x - ty * w * s2, y + tx * w * s2, depth * 2 * w * max(zf, math.sqrt(max(0, 1 - s * s)))))
        rows.append(row)
    m = []

    def add(a, b, c, u):
        C = col(u) if callable(col) else col
        m.append((*a, *b, *c, C, None if flat else rnd.uniform(-jit, jit)))

    for k in range(n - 1):
        A, B, u = rows[k], rows[k + 1], (k + 0.5) / (n - 1)
        for i in range(len(SIDES) - 1):
            if (k + i) % 2:
                add(A[i], A[i + 1], B[i], u)
                add(A[i + 1], B[i + 1], B[i], u)
            else:
                add(A[i], A[i + 1], B[i + 1], u)
                add(A[i], B[i + 1], B[i], u)
    for on, k, sg, u in ((cap, n - 1, 1, 1.0), (cap0, 0, -1, 0.0)):
        w = widths[k] / 2
        if on and w > 1:
            (x, y), (tx, ty) = sp[k], tans[k]
            tip = (x + sg * tx * w * 0.8, y + sg * ty * w * 0.8, depth * 2 * w * zf)
            for i in range(len(SIDES) - 1):
                add(rows[k][i], rows[k][i + 1], tip, u)
    return m


def flat_poly(pts, col):
    """Unshaded fan (eyes, pads, highlights)."""
    m = []
    cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        m.append((a[0], a[1], 0, b[0], b[1], 0, cx, cy, 0, col, None))
    return m


def arc_band(cx, cy, r, a0, a1, th, col, n=9):
    """Thick arc (closed eyes, smiles) as a flat strip."""
    pts_o, pts_i = [], []
    for i in range(n):
        a = math.radians(lerp(a0, a1, i / (n - 1)))
        k = 1 - 0.55 * abs(2 * i / (n - 1) - 1) ** 2  # tapered ends
        pts_o.append((cx + (r + th / 2 * k) * math.cos(a), cy + (r + th / 2 * k) * math.sin(a)))
        pts_i.append((cx + (r - th / 2 * k) * math.cos(a), cy + (r - th / 2 * k) * math.sin(a)))
    m = []
    for i in range(n - 1):
        for a, b, c in ((pts_o[i], pts_o[i + 1], pts_i[i]), (pts_i[i], pts_o[i + 1], pts_i[i + 1])):
            m.append((a[0], a[1], 0, b[0], b[1], 0, c[0], c[1], 0, col, None))
    return m


def aff(tx=0.0, ty=0.0, rot=0.0, sx=1.0, sy=None, px=0.0, py=0.0):
    """Affine taking local point (px,py) to (tx,ty), rotated by rot degrees (clockwise on screen) and scaled."""
    sy = sx if sy is None else sy
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    a, b, cc, d = c * sx, -s * sy, s * sx, c * sy
    return (a, b, cc, d, tx - a * px - b * py, ty - cc * px - d * py)


def mul(M, N):
    a, b, c, d, e, f = M
    A, B, C, D, E, F = N
    return (a * A + b * C, a * B + b * D, c * A + d * C, c * B + d * D, a * E + b * F + e, c * E + d * F + f)


def app(M, x, y):
    return (M[0] * x + M[1] * y + M[4], M[2] * x + M[3] * y + M[5])
ID = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def project(items):
    """items: (mesh, M[, k]) -> [(flat xy tuple, fill)], shaded after the transform so the light stays fixed."""
    polys = []
    for it in items:
        mesh, M = it[0], it[1]
        km = it[2] if len(it) > 2 else 1.0
        a, b, c, d, e, f = M
        zs = math.sqrt(abs(a * d - b * c))
        for t in mesh:
            x0, y0 = a * t[0] + b * t[1] + e, c * t[0] + d * t[1] + f
            x1, y1 = a * t[3] + b * t[4] + e, c * t[3] + d * t[4] + f
            x2, y2 = a * t[6] + b * t[7] + e, c * t[6] + d * t[7] + f
            if t[10] is None:
                fill = t[9] if km == 1.0 else mulc(t[9], km)
            else:
                ux, uy, uz = x1 - x0, y1 - y0, (t[5] - t[2]) * zs
                vx, vy, vz = x2 - x0, y2 - y0, (t[8] - t[2]) * zs
                nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
                ln = math.sqrt(nx * nx + ny * ny + nz * nz)
                if ln < 1e-9:
                    continue
                if nz < 0:
                    nx, ny, nz = -nx, -ny, -nz
                dd = (nx * LX + ny * LY + nz * LZ) / ln
                fill = tone(t[9], clamp((1 + 0.75 * (dd - LZ) + t[10]) * km, 0.5, 1.3))
            polys.append(((x0, y0, x1, y1, x2, y2), fill))
    return polys


def draw_polys(d, polys, ox=0.0, oy=0.0):
    for p, col in polys:
        q = [((p[0] - ox) * S, (p[1] - oy) * S), ((p[2] - ox) * S, (p[3] - oy) * S), ((p[4] - ox) * S, (p[5] - oy) * S)]
        d.polygon(q, fill=col, outline=col)


def sprite(items, pad=3):
    """Rasterise mesh items (world coords) into a tight RGBA sprite; returns (img, x0, y0)."""
    polys = project(items)
    if not polys:
        return None, 0, 0
    xs = [v for p, _ in polys for v in p[0::2]]
    ys = [v for p, _ in polys for v in p[1::2]]
    x0, y0 = math.floor(min(xs)) - pad, math.floor(min(ys)) - pad
    w, h = math.ceil(max(xs)) + pad - x0, math.ceil(max(ys)) + pad - y0
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    draw_polys(ImageDraw.Draw(im), polys, x0, y0)
    return im.resize((w, h), Image.LANCZOS), x0, y0


def stamp(img, items):
    spr, x0, y0 = sprite(items)
    if spr is not None:
        blit(img, spr, x0, y0)
FUR, PINK, EYE = (242, 240, 246), (244, 170, 182), (44, 34, 40)
HOOD, HOODD, PANT = (240, 112, 96), (208, 86, 80), (230, 172, 74)


@lru_cache(maxsize=None)
def rabbit_parts():
    P = {}
    P["torso"] = blob([(-56, -324), (0, -332), (56, -324), (90, -298), (102, -240), (106, -170), (110, -104), (102, -66), (56, -54),
                       (0, -50), (-56, -54), (-102, -66), (-110, -104), (-106, -170), (-102, -240), (-90, -298)],
                      lambda x, y: HOODD if y > -76 else HOOD, depth=70, rings=(0.74, 0.46, 0.2), wob=0.04, center=(-6, -214), seed=1)
    P["pocket"] = blob([(-56, -146), (56, -146), (72, -84), (-72, -84)], (226, 98, 86), depth=14, rings=(0.5,), seed=2)
    for sx, key, k in ((-1, "legR", 0.9), (1, "legL", 1.0)):  # thighs out to raised knees, shins crossing in front
        P[key + "T"] = tube([(-sx * 10, -98), (-sx * 100, -108), (-sx * 176, -100)], [84, 78, 70], mulc(PANT, k * 0.94),
                            depth=0.42, seed=3 + sx)
        P[key] = tube([(-sx * 196, -78), (-sx * 110, -50), (-sx * 10, -38), (sx * 50, -38)], [66, 60, 54, 48], mulc(PANT, k),
                      depth=0.42, cap0=True, seed=5 + sx)
    for sx, key in ((1, "footL"), (-1, "footR")):
        fx = sx * 66
        m = blob(ell_pts(fx, -38, 40, 26, 10, rot=-sx * 14), FUR, depth=20, rings=(0.55,), seed=5 + sx)
        m += flat_poly(ell_pts(fx, -32, 15, 11, 8), PINK)
        for dx, dy in ((-20, -50), (0, -56), (20, -50)):
            m += flat_poly(ell_pts(fx + dx * 0.9, dy + 4, 6.5, 5.5, 6), PINK)
        P[key] = m
    for sx in (-1, 1):
        P["arm%d" % sx] = tube([(sx * x, y) for x, y in ((84, -300), (114, -262), (136, -214), (144, -172), (122, -140), (88, -120), (58, -110))],
                               [56, 54, 52, 52, 50, 46, 48],
                               lambda u: HOODD if u > 0.84 else mulc(HOOD, 1.04), depth=0.45, seed=8 + sx)
        P["paw%d" % sx] = blob(ell_pts(sx * 40, -104, 30, 22, 10), FUR, depth=18, rings=(0.55,), seed=11 + sx)
        P["string%d" % sx] = tube([(sx * 22, -318), (sx * 24, -284), (sx * 25, -252)], [8, 7, 7], (250, 236, 220), depth=0.3, seed=13 + sx)
    P["collar"] = blob(ell_pts(0, -326, 100, 32, 14), HOODD, depth=30, rings=(0.6,), seed=16)
    head = []
    for i in range(18):
        a = math.radians(-90 + 20 * i)
        head.append((110 * math.cos(a) * (1 + 0.08 * max(0, math.sin(a))), -422 + 100 * math.sin(a)))
    P["head"] = blob(head, FUR, depth=78, rings=(0.76, 0.5, 0.24), center=(0, -452), wob=0.03, seed=17)
    P["muzzle"] = blob(ell_pts(0, -378, 50, 32, 12), (252, 251, 252), depth=16, rings=(0.55,), wob=0.03, seed=18)
    P["cheeks"] = flat_poly(ell_pts(-74, -388, 18, 10, 8), (250, 200, 206)) + flat_poly(ell_pts(74, -388, 18, 10, 8), (250, 200, 206))
    P["nose"] = blob([(-12, -399), (12, -399), (0, -386)], (232, 124, 144), depth=5, rings=(0.4,), seed=19)
    P["mouth"] = (tube([(0, -387), (0, -376)], [3.5, 3.5], (110, 80, 88), flat=True, cap=False)
                  + arc_band(-8, -377, 8, 10, 150, 3.5, (110, 80, 88), 6) + arc_band(8, -377, 8, 30, 170, 3.5, (110, 80, 88), 6))
    P["closed"] = arc_band(-44, -436, 17, 15, 165, 6, EYE) + arc_band(44, -436, 17, 15, 165, 6, EYE)
    return P


def rabbit_ear(sx, bend):
    sp = bez((0, 0), (sx * 6 + bend * 0.3, -95), (sx * 16 + bend, -192 + abs(bend) * 0.25), 7)
    inner = bez((0, -18), (sx * 6 + bend * 0.3, -95), (sx * 15 + bend * 0.94, -174 + abs(bend) * 0.25), 7)
    return (tube(sp, [42, 52, 56, 54, 48, 36, 18], FUR, depth=0.42, seed=30 + sx),
            tube(inner, [14, 26, 30, 28, 22, 13, 4], PINK, depth=0.12, seed=32 + sx, jit=0.03))


def rabbit_items(M0, t, wind, eyes):
    P = rabbit_parts()
    b = (math.sin(t * 2 * math.pi / 3) + 1) / 2  # breath, 3 s cycle
    up = -7 * b
    Mt = mul(M0, aff(0, -50, 0, 1 + 0.02 * b, 1 + 0.035 * b, 0, -50))
    Mu = mul(M0, aff(0, up))
    Mh = mul(M0, aff(0, -330 + up, 1.6 * math.sin(t * 0.7) - 1.5 * wind, 1, 1, 0, -330))
    items = []
    for sx, ph in ((-1, 0.0), (1, 1.7)):
        bend = 4 * math.sin(t * 1.1 + ph) + wind * (24 + 12 * math.sin(t * 11 + ph))
        rot = sx * 12 + wind * 5 * math.sin(t * 13 + ph * 2)
        outer, inner = rabbit_ear(sx, bend)
        Me = mul(Mh, aff(sx * 40, -500, rot))
        items += [(outer, Me), (inner, Me)]
    items += [(P["torso"], Mt), (P["pocket"], Mt), (P["legRT"], M0), (P["legLT"], M0), (P["legR"], M0), (P["legL"], M0), (P["footR"], M0), (P["footL"], M0)]
    for sx in (-1, 1):
        items += [(P["arm%d" % sx], mul(M0, aff(0, up * 0.5))), (P["paw%d" % sx], mul(M0, aff(0, up * 0.2)))]
    items += [(P["collar"], Mu), (P["string-1"], mul(M0, aff(-wind * 4, up))), (P["string1"], mul(M0, aff(-wind * 3, up))),
              (P["head"], Mh), (P["muzzle"], Mh), (P["cheeks"], Mh), (P["nose"], Mh), (P["mouth"], Mh)]
    if eyes <= 0.5:
        items.append((P["closed"], Mh))
    else:
        o = min(1.0, (eyes - 0.5) * 3)
        for sx in (-1, 1):
            items.append((blob(ell_pts(sx * 44, -432, 16, 19 * o, 10), EYE, depth=7, rings=(0.5,), seed=40 + sx, jit=0.1), Mh))
            if o > 0.5:
                items.append((flat_poly(ell_pts(sx * 44 - 6, -439, 6, 6, 8), WHITE), Mh))
                items.append((flat_poly(ell_pts(sx * 44 + 5, -424, 2.6, 2.6, 6), WHITE), Mh))
    return items
FOXC, FOXL, FOXK, FCR = (226, 112, 44), (214, 98, 40), (66, 46, 40), (250, 236, 214)


@lru_cache(maxsize=None)
def fox_parts():
    P = {}
    P["body"] = blob([(-126, -8), (-116, -42), (-82, -58), (-20, -60), (40, -58), (92, -52), (124, -30), (134, 6), (120, 38), (82, 52),
                      (20, 50), (-40, 48), (-96, 42), (-122, 22)],
                     lambda x, y: FCR if (x > 64 and y > -14) else FOXC, depth=58, seed=50)
    P["thigh"] = blob(ell_pts(0, 0, 54, 46, 12, rot=-20), FOXL, depth=34, rings=(0.6,), seed=51)
    P["head"] = blob([(-22, -30), (-4, -60), (36, -72), (72, -60), (100, -34), (140, -10), (152, 2), (140, 14), (104, 20), (64, 30),
                      (22, 34), (-8, 20), (-24, -4)], lambda x, y: FCR if (y > 0 and x > 8) or (x < 20 and y > -6) else FOXC,
                     depth=44, rings=(0.68, 0.36), seed=52)
    P["earB"] = blob([(4, -52), (16, -122), (48, -62)], lambda x, y: FOXK if y < -96 else FOXL, depth=10, rings=(0.5,), seed=53)
    P["earF"] = blob([(34, -62), (58, -128), (80, -56)], lambda x, y: FOXK if y < -100 else FOXC, depth=12, rings=(0.5,), seed=54)
    P["earI"] = blob([(46, -64), (58, -110), (70, -62)], (250, 226, 200), depth=4, rings=(0.4,), seed=55)
    P["eye"] = (blob(ell_pts(80, -32, 10, 7.5, 8, rot=-12), (40, 28, 26), depth=4, rings=(0.4,), seed=56, jit=0.08)
                + flat_poly(ell_pts(77, -35, 3, 3, 6), WHITE))
    P["nose"] = blob(ell_pts(150, 0, 10, 8, 8), (36, 28, 28), depth=6, rings=(0.4,), seed=57)
    legc = lambda u: FOXK if u > 0.45 else FOXC
    paw = blob(ell_pts(8, 126, 18, 9, 8), FOXK, depth=8, rings=(0.5,), seed=58)
    P["legF"] = tube([(0, 0), (2, 42), (-1, 84), (2, 122)], [34, 28, 22, 21], legc, seed=59) + paw
    P["legB"] = tube([(0, -6), (12, 40), (-10, 84), (-4, 122)], [50, 38, 22, 21], legc, seed=60) + paw
    return P


def fox_items(M0, ph, amp, sit, wag):
    P = fox_parts()
    sw = math.sin(ph) * 26 * amp
    bob = -abs(math.cos(ph)) * 7 * amp
    Mb = aff(lerp(0, -18, sit), lerp(-150, -120, sit) + bob, lerp(0, -38, sit))
    hipF, hipB = app(Mb, 82, 22), app(Mb, -84, 16)
    items = []

    def leg(mesh, hip, ang, sy, dx=0.0, k=1.0):
        items.append((mesh, mul(M0, aff(hip[0] + dx, hip[1] - 4 * (dx != 0), ang, 1, sy)), k))

    lenF = lerp(1.0, -hipF[1] / 126, sit)
    angB, syB = lerp(-sw, -78, sit), lerp(1.0, 0.82, sit)
    pv = app(Mb, -118, -6)
    p1 = lerpp((-80, 4), (-36, 50), sit)
    p2 = lerpp((-168, -40 + wag * 8), (118, -pv[1] - 28 + wag * 5), sit)
    tail = tube(bez((0, 0), p1, p2, 7), [26, 52, 64, 62, 52, 30, 8], lambda u: FCR if u > 0.8 else FOXC, depth=0.45, seed=61)
    Mtail = mul(M0, aff(pv[0], pv[1]))
    leg(P["legB"], hipB, lerp(sw, -70, sit), syB, 12, 0.8)
    leg(P["legF"], hipF, lerp(-sw, 4, sit), lenF, 12, 0.8)
    if sit < 0.5:
        items.append((tail, Mtail))
    items.append((P["body"], mul(M0, Mb)))
    leg(P["legB"], hipB, angB, syB)
    items.append((P["thigh"], mul(M0, aff(*app(Mb, -78, -4), lerp(0, -30, sit)))))
    leg(P["legF"], hipF, lerp(sw, 0, sit), lenF)
    if sit >= 0.5:
        items.append((tail, Mtail))
    neck = app(Mb, 112, -30)
    Mh = mul(M0, aff(neck[0], neck[1] + bob * 0.3, lerp(-6, -2, sit) + 2 * math.sin(ph * 0.5) * amp))
    items += [(P["earB"], Mh), (P["head"], Mh), (P["earF"], Mh), (P["earI"], Mh), (P["eye"], Mh), (P["nose"], Mh)]
    return items
DEERC, DEERL, DEERK, ANT = (200, 142, 84), (232, 196, 150), (150, 100, 62), (112, 76, 50)


@lru_cache(maxsize=None)
def deer_parts():
    P = {}
    P["body"] = blob([(-122, -10), (-110, -44), (-60, -58), (0, -60), (60, -58), (106, -46), (128, -14), (122, 24), (90, 46), (30, 52),
                      (-30, 50), (-90, 44), (-118, 20)], lambda x, y: DEERL if y > 30 else DEERC, depth=56, seed=70)
    P["tail"] = blob(ell_pts(-124, -24, 15, 22, 8), (246, 238, 226), depth=10, rings=(0.5,), seed=71)
    P["thigh"] = blob(ell_pts(0, 0, 50, 52, 12), mulc(DEERC, 0.96), depth=30, rings=(0.6,), seed=72)
    P["neck"] = tube(bez((0, 0), (16, -60), (30, -128), 6), [66, 54, 46, 42, 40, 40], lambda u: DEERC, depth=0.5, seed=73)
    P["head"] = blob([(-30, -12), (-20, -42), (10, -50), (42, -38), (80, -14), (98, 4), (92, 20), (60, 24), (20, 22), (-14, 14)],
                     lambda x, y: DEERL if x > 66 or y > 12 else DEERC, depth=36, rings=(0.66, 0.3), seed=75)
    P["nose"] = blob(ell_pts(95, 6, 9, 8, 8), (44, 34, 30), depth=5, rings=(0.4,), seed=76)
    P["eye"] = (blob(ell_pts(30, -22, 9, 8, 8), (36, 26, 24), depth=4, rings=(0.4,), seed=77, jit=0.08)
                + flat_poly(ell_pts(27, -25, 3, 3, 6), WHITE))
    ear = lambda sd, k: tube(bez((0, 0), (-34, -10), (-62, -6), 5), [20, 30, 30, 22, 6], mulc(DEERC, k), depth=0.3, seed=sd)
    P["earB"], P["earF"] = ear(78, 0.85), ear(79, 1.0)
    P["earI"] = tube(bez((-6, 0), (-34, -10), (-56, -6), 5), [8, 16, 16, 10, 2], (238, 190, 170), depth=0.1, seed=80)
    ant = []
    for k, (dx, kk) in enumerate(((0, 0.8), (14, 1.0))):
        c = mulc(ANT, kk)
        ant.append(tube(bez((dx, 0), (dx - 34, -60), (dx - 6, -146), 7), [11, 10, 9, 8, 7, 6, 4], c, depth=0.4, seed=81 + k)
                   + tube(bez((dx - 18, -40), (dx - 40, -56), (dx - 54, -82), 4), [8, 7, 6, 3], c, depth=0.4, seed=83 + k)
                   + tube(bez((dx - 20, -84), (dx - 2, -96), (dx + 18, -120), 4), [8, 7, 6, 3], c, depth=0.4, seed=85 + k)
                   + tube(bez((dx - 14, -116), (dx - 30, -132), (dx - 34, -154), 4), [7, 6, 5, 2], c, depth=0.4, seed=87 + k))
    P["antB"], P["antF"] = ant
    legc = lambda u: (44, 34, 30) if u > 0.9 else DEERK if u > 0.5 else DEERC
    P["legF"] = tube([(0, 0), (2, 66), (0, 134), (3, 200)], [30, 20, 14, 13], legc, seed=89)
    P["legB"] = tube([(0, -10), (12, 56), (-12, 128), (-6, 200)], [44, 30, 16, 13], legc, seed=90)
    return P


def deer_items(M0, ph, amp, sit):
    P = deer_parts()
    sw = math.sin(ph) * 22 * amp
    bob = -abs(math.cos(ph)) * 6 * amp
    Mb = aff(0, lerp(-250, -66, sit) + bob, lerp(0, -3, sit))
    hipF, hipB = app(Mb, 84, 24), app(Mb, -84, 18)
    items = []

    def leg(mesh, hip, ang, sy, dx=0.0, k=1.0):
        items.append((mesh, mul(M0, aff(hip[0] + dx, hip[1], ang, 1, sy)), k))

    leg(P["legB"], hipB, lerp(sw, -84, sit), lerp(1, 0.42, sit), 14, 0.78)
    leg(P["legF"], hipF, lerp(-sw, -96, sit), lerp(1, 0.5, sit), 14, 0.78)
    items.append((P["body"], mul(M0, Mb)))
    items.append((P["tail"], mul(M0, Mb)))
    leg(P["legB"], hipB, lerp(-sw, -86, sit), lerp(1, 0.46, sit))
    items.append((P["thigh"], mul(M0, aff(*app(Mb, -76, -6)))))
    leg(P["legF"], hipF, lerp(sw, -92, sit), lerp(1, 0.56, sit))
    nb = app(Mb, 96, -30)
    nrot = lerp(16, 4, sit) + 2 * math.sin(ph * 0.5) * amp
    Mn = mul(M0, aff(nb[0], nb[1], nrot))
    items.append((P["neck"], Mn))
    top = app(aff(nb[0], nb[1], nrot), 30, -128)
    Mh = mul(M0, aff(top[0], top[1], lerp(-4, 4, sit)))
    items += [(P["antB"], mul(Mh, aff(-4, -40))), (P["earB"], mul(Mh, aff(-8, -34, 24))), (P["head"], Mh), (P["antF"], mul(Mh, aff(6, -42))),
              (P["earF"], mul(Mh, aff(-12, -30, 8))), (P["earI"], mul(Mh, aff(-12, -30, 8))), (P["eye"], Mh), (P["nose"], Mh)]
    return items
HFACE, HFACEL = (226, 186, 136), (242, 214, 172)


@lru_cache(maxsize=None)
def hedgehog_parts():
    P = {}
    cx, cy, rx, ry = 0, -76, 120, 70
    P["body"] = blob(ell_pts(cx, cy, rx, ry, 14), lambda x, y: (176, 136, 98) if y > -40 else (122, 96, 76), depth=50, seed=100)
    rnd = random.Random(101)
    sp = []
    for f, ln, wd, cnt, a0, a1 in ((1.0, 60, 32, 14, 176, 318), (0.84, 54, 30, 12, 182, 312), (0.66, 48, 28, 10, 190, 304),
                                    (0.46, 42, 26, 7, 200, 296)):
        for i in range(cnt):
            a = math.radians(lerp(a0, a1, (i + 0.5 * (f < 0.9)) / (cnt - 1)) + rnd.uniform(-3, 3))
            bx, by = cx + rx * f * math.cos(a), cy + ry * f * math.sin(a)
            phi = math.atan2(math.sin(a) / ry, math.cos(a) / rx) - math.radians(24)
            dx, dy = math.cos(phi), math.sin(phi)
            L = ln * rnd.uniform(0.85, 1.12)
            w = wd / 2
            bl, br = (bx + dy * w, by - dx * w, 3.0), (bx - dy * w, by + dx * w, 3.0)
            mid = (bx - dx * 6, by - dy * 6, 14.0)
            q = (bx + dx * L * 0.62, by + dy * L * 0.62, 8.0)
            tip = (bx + dx * L, by + dy * L, 1.0)
            col = rnd.choice([(96, 80, 70), (112, 96, 84), (128, 112, 98), (84, 72, 64)])
            tc = (180, 166, 150) if rnd.random() < 0.7 else (150, 136, 120)
            for a3, b3, c3, cc in ((bl, mid, q, col), (mid, br, q, col), (bl, q, tip, tc), (q, br, tip, tc)):
                sp.append((*a3, *b3, *c3, cc, rnd.uniform(-0.05, 0.05)))
    P["spines"] = sp
    P["face"] = blob([(34, -108), (76, -124), (116, -104), (152, -70), (180, -46), (176, -30), (146, -20), (104, -10), (60, -14), (30, -46)],
                     lambda x, y: HFACEL if x > 128 else HFACE, depth=40, rings=(0.66, 0.32), seed=102)
    P["ear"] = blob(ell_pts(80, -122, 15, 17, 8), (196, 150, 112), depth=10, rings=(0.5,), seed=103)
    P["nose"] = blob(ell_pts(180, -40, 10, 9, 8), (40, 30, 28), depth=5, rings=(0.4,), seed=104)
    P["eye"] = (blob(ell_pts(116, -74, 9, 10, 8), (36, 26, 24), depth=4, rings=(0.4,), seed=105, jit=0.08)
                + flat_poly(ell_pts(113, -78, 3.2, 3.2, 6), WHITE))
    P["cheek"] = flat_poly(ell_pts(120, -46, 13, 8, 8), (240, 176, 160))
    P["leg"] = tube([(0, 0), (0, 16), (2, 30)], [24, 22, 20], (92, 68, 54), depth=0.4, seed=106)
    return P


def hedgehog_items(M0, ph, amp, sit):
    P = hedgehog_parts()
    wob = math.sin(ph) * 16 * amp
    Mb = mul(M0, aff(-100, -abs(math.cos(ph)) * 4 * amp, lerp(0, -7, sit), 1, 1, -100, 0))
    items = []
    for x, s in ((-52, 1), (60, -1)):
        items.append((P["leg"], mul(Mb, aff(x + 14, -30, s * wob)), 0.8))
    items.append((P["body"], Mb))
    for x, s in ((-66, -1), (44, 1)):
        items.append((P["leg"], mul(Mb, aff(x, -30, s * wob + lerp(0, -18, sit) * (x > 0)))))
    items += [(P["spines"], Mb), (P["ear"], Mb), (P["face"], Mb), (P["cheek"], Mb), (P["eye"], Mb), (P["nose"], Mb)]
    return items


@lru_cache(maxsize=None)
def leaf_mesh(col):
    rib = [(-34, 0, 2.0), (-12, 0, 9.0), (10, 0, 9.0), (34, 0, 2.0)]
    top = [(-22, -13, 0.0), (0, -18, 0.0), (22, -11, 0.0)]
    bot = [(x, -y, z) for x, y, z in top]
    m = []
    rnd = random.Random(sum(col))
    for e in (top, bot):
        for a, b, c in ((rib[0], e[0], rib[1]), (e[0], e[1], rib[1]), (rib[1], e[1], rib[2]), (e[1], e[2], rib[2]), (rib[2], e[2], rib[3])):
            m.append((*a, *b, *c, col, rnd.uniform(-0.05, 0.05)))
    m += tube([(-46, 0), (-34, 0)], [4, 3], mulc(col, 0.7), flat=True, cap=False)
    return m


def tuft_mesh(x, y, s, sway, rnd_cols):
    m = []
    for (dx, h), col in zip(((-16, 60), (0, 82), (16, 56)), rnd_cols):
        h *= s
        w = 8 * s
        bl, br, bc = (x + dx - w, y, 0.0), (x + dx + w, y, 0.0), (x + dx + 1.5, y, w * 1.6)
        tip = (x + dx * 1.6 + sway * h / 60, y - h, 0.0)
        m.append((*bl, *bc, *tip, col, 0.0))
        m.append((*bc, *br, *tip, col, 0.0))
    return m


def grid_rows(rows):
    """Triangles between successive staggered rows of points (row r+1 shifted half a step vs row r)."""
    tris = []
    for r in range(len(rows) - 1):
        A, B = rows[r], rows[r + 1]
        for i in range(min(len(A), len(B)) - 1):
            if r % 2 == 0:
                tris += [(A[i], A[i + 1], B[i]), (A[i + 1], B[i + 1], B[i])]
            else:
                tris += [(A[i], A[i + 1], B[i + 1]), (A[i], B[i + 1], B[i])]
    return tris


def sky_polys(top, bot, y1, rnd, cell=170, jit=0.035, x0=-200):
    rows = []
    nr = int(y1 / (cell * 0.87)) + 3
    for r in range(nr):
        rows.append([(x0 + i * cell + (r % 2) * cell / 2 + rnd.uniform(-0.3, 0.3) * cell,
                      -cell + r * cell * 0.87 + rnd.uniform(-0.3, 0.3) * cell) for i in range(int((W - 2 * x0) / cell) + 2)])
    out = []
    for a, b, c in grid_rows(rows):
        u = clamp(((a[1] + b[1] + c[1]) / 3) / y1)
        col = tuple(top[i] + (bot[i] - top[i]) * u for i in range(3))
        k = 1 + rnd.uniform(-jit, jit)
        out.append(((a[0], a[1], b[0], b[1], c[0], c[1]), mulc(col, k)))
    return out


def hill_polys(base, amp, freq, ph, col, bottom, rnd, step=120, rowh=90, sk=0.7, jit=0.045):
    prof = lambda x: base + amp * math.sin(x * freq + ph)
    rows = []
    nr = int((bottom - base + amp) / rowh) + 2
    for r in range(nr):
        row = []
        for i in range(int((W + 300) / step) + 2):
            x = -150 + i * step + (r % 2) * step / 2 + rnd.uniform(-0.28, 0.28) * step
            y = prof(x) + (rnd.uniform(-7, 7) if r == 0 else r * rowh + rnd.uniform(-0.3, 0.3) * rowh)
            row.append((x, y))
        rows.append(row)
    out = []
    for a, b, c in grid_rows(rows):
        cx = (a[0] + b[0] + c[0]) / 3
        dy = (prof(cx + 5) - prof(cx - 5)) / 10
        depth = clamp(((a[1] + b[1] + c[1]) / 3 - prof(cx)) / 300)
        k = 1 - sk * dy + rnd.uniform(-jit, jit) - 0.07 * depth
        out.append(((a[0], a[1], b[0], b[1], c[0], c[1]), tone(col, clamp(k, 0.6, 1.25))))
    return out


def mountain_polys(rnd, yb=1090):
    ridge, x, up = [], -120, False
    while x < W + 200:
        ridge.append((x, (rnd.uniform(840, 920) if up else rnd.uniform(950, 1000))))
        x += rnd.uniform(110, 170)
        up = not up
    base = [(px + rnd.uniform(-30, 30), yb) for px, _ in ridge]
    out = []
    for i in range(len(ridge) - 1):
        a, b, c, d = ridge[i], ridge[i + 1], base[i], base[i + 1]
        lit = b[1] < a[1]
        col = (246, 204, 170) if lit else (226, 172, 156)
        m = lerpp(lerpp(a, b, 0.5), lerpp(c, d, 0.5), rnd.uniform(0.35, 0.6))  # a fold point on each face
        for p, q, k in ((a, b, 1.0), (b, d, 0.95), (d, c, 0.97), (c, a, 1.02)):
            out.append(((p[0], p[1], q[0], q[1], m[0], m[1]), mulc(col, k + rnd.uniform(-0.03, 0.03))))
    return out


def flower(x, y, col, rnd):
    pts = ell_pts(x, y, 11, 8, 10, a0=rnd.uniform(0, 36))
    m = []
    for i in range(10):
        a, b = pts[i], pts[(i + 1) % 10]
        k = 1.0 if i % 2 else 0.84
        m.append((a[0], a[1], 0, b[0], b[1], 0, x, y, 0, mulc(col, k), None))
    return m + flat_poly(ell_pts(x, y, 3.5, 3, 6), (240, 150, 60))


def make_bg(kind):
    im = Image.new("RGB", (W * S, H * S))
    d = ImageDraw.Draw(im)
    rnd = random.Random(7 if kind == "meadow" else 8)
    if kind == "meadow":
        draw_polys(d, sky_polys((250, 172, 138), (255, 228, 160), 1150, rnd))
        halo = Image.new("RGBA", im.size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        for r0, r1, a in ((330, 250, 46), (250, 180, 70)):
            o, i_ = ell_pts(790, 700, r0, r0, 16), ell_pts(790, 700, r1, r1, 16, a0=-90 + 11.25)
            ring = [(o[k], o[(k + 1) % 16], i_[k]) for k in range(16)] + [(i_[k], o[(k + 1) % 16], i_[(k + 1) % 16]) for k in range(16)]
            for k, (p, q, s) in enumerate(ring):
                aa = int(a * (1 + 0.25 * ((k * 7) % 3 - 1) / 2))
                hd.polygon([(p[0] * S, p[1] * S), (q[0] * S, q[1] * S), (s[0] * S, s[1] * S)], fill=(255, 238, 186, aa))
        im.paste(Image.alpha_composite(im.convert("RGBA"), halo).convert("RGB"))
        d = ImageDraw.Draw(im)
        draw_polys(d, project([(blob(ell_pts(790, 700, 168, 168, 16), (255, 214, 116), depth=36, rings=(0.62, 0.3), seed=9, jit=0.025), ID)]))
        draw_polys(d, mountain_polys(rnd))
        draw_polys(d, hill_polys(1010, 55, 0.006, 0.4, (150, 200, 122), 1400, rnd))
        draw_polys(d, hill_polys(1130, 65, 0.0045, 2.0, (112, 176, 100), 1450, rnd))
        draw_polys(d, hill_polys(1250, 45, 0.007, 4.1, (88, 152, 88), 1500, rnd))
        draw_polys(d, hill_polys(1340, 12, 0.004, 1.0, (76, 142, 84), H + 100, rnd, step=150, rowh=120, sk=0.4, jit=0.06))
        for _ in range(30):
            x, y = rnd.randint(20, W - 20), rnd.randint(1370, 1900)
            if 300 < x < 780 and y < 1500:
                continue
            draw_polys(d, project([(flower(x, y, rnd.choice([(250, 170, 190), (255, 224, 110), (255, 250, 240)]), rnd), ID)]))
    else:
        draw_polys(d, sky_polys((255, 246, 230), (252, 230, 198), 1700, rnd, cell=200, jit=0.012))
        draw_polys(d, hill_polys(1560, 50, 0.005, 0.8, (150, 200, 122), 1800, rnd))
        draw_polys(d, hill_polys(1650, 45, 0.006, 2.6, (112, 176, 100), 1850, rnd))
        draw_polys(d, hill_polys(1740, 40, 0.007, 4.5, (88, 152, 88), H + 100, rnd))
    return im.resize((W, H), Image.LANCZOS)


def make_cloud(w, seed):
    rnd = random.Random(seed)
    items = []
    for i, (dx, r) in enumerate(((0.22, 0.24), (0.42, 0.34), (0.64, 0.29), (0.82, 0.2))):
        cx, rr = w * dx, w * r * 0.5
        pts = [(x, min(y, 80 + rr * 0.15)) for x, y in ell_pts(cx, 80 - rr * 0.45, rr, rr * 0.95, 10)]
        items.append((blob(pts, (255, 242, 228), depth=rr * 0.7, rings=(0.6,), seed=seed * 10 + i, jit=0.03), ID))
    items.append((blob(ell_pts(w * 0.52, 82, w * 0.4, 18, 12), (250, 232, 222), depth=10, rings=(0.5,), seed=seed), ID))
    return sprite(items)[0]


@lru_cache(maxsize=None)
def shadow(w, h):
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    ImageDraw.Draw(im).polygon([(x * S, y * S) for x, y in ell_pts(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 14)], fill=(24, 64, 40, 74))
    return im.resize((w, h), Image.LANCZOS)


class Assets:
    def __init__(self):
        self.bg, self.end_bg = make_bg("meadow"), make_bg("end")
        self.icon = rounded_icon(320)
        rock = [(-222, -10), (-212, -64), (-170, -112), (-96, -140), (0, -150), (92, -142), (168, -116), (214, -66), (226, -12),
                (180, 26), (80, 40), (-40, 40), (-160, 30)]
        self.rock = sprite([(blob(rock, (160, 152, 170), depth=120, rings=(0.7, 0.36), center=(-10, -84), seed=3, jit=0.06, wob=0.1),
                             aff(540, 1440))])
        self.clouds = [(make_cloud(300, 1), 470, 100, 7), (make_cloud(220, 2), 600, 700, 5), (make_cloud(260, 3), 360, 420, 9)]
        self.leaf_cols = [(236, 130, 50), (120, 180, 80), (250, 190, 70), (210, 92, 60)]
        rnd = random.Random(11)
        self.tufts = sorted([(rnd.randint(0, W), rnd.randint(1340, 1900), rnd.uniform(0.8, 1.4), rnd.random() * 6,
                              [rnd.choice([(64, 128, 74), (96, 170, 98), (80, 152, 86)]) for _ in range(3)]) for _ in range(40)],
                            key=lambda p: p[1])


def draw_tufts(img, A, t, w, front):
    for x, y, s, ph, cols in A.tufts:
        if (y >= 1700) != front:
            continue
        sway = (6 + 30 * w) * math.sin(t * 2.2 + ph) + 22 * w
        stamp(img, [(tuft_mesh(x, y, s, sway, cols), ID)])


def animal(t, t0, dur, x0, x1):
    p = prog(t, t0, t0 + dur)
    x = x0 + (x1 - x0) * ease_out(p)
    tt = t - (t0 + dur)
    sq = 1 + 0.08 * math.sin(tt * 14) * math.exp(-tt * 5) if tt > 0 else 1.0
    amp = 1 - prog(t, t0 + dur - 0.45, t0 + dur - 0.1)  # stride fades out as it arrives
    sit = ease_io(prog(t, t0 + dur - 0.4, t0 + dur))
    return x, amp, sit, sq


def root(x, y, sc, sq, flip=False):
    return aff(x, y, 0, sc * (2 - sq) * (-1 if flip else 1), sc * sq)


# --- style: the storyboard's scenes drawn with the kit above -------------------------------

FILLS = {"cream": CREAM, "white": WHITE, "ink": INK, "sage": SAGE}


class Style(Base):
    name = "lowpoly"

    def assets(self):
        return Assets()

    # pose API: each returns a factory M -> mesh items, M being the placement transform (see root)
    def rabbit(self, t, wind, eyes):
        return lambda M: rabbit_items(M, t, wind, eyes)

    def fox(self, phase, stride, sat, blink, tilt, wag=0.0, squash=0.0):
        return lambda M: fox_items(M, phase, stride, sat, wag)

    def deer(self, phase, stride, sat, blink, tilt, squash=0.0):
        return lambda M: deer_items(M, phase, stride, sat)

    def hedgehog(self, phase, stride, sat, blink, tilt, squash=0.0):
        return lambda M: hedgehog_items(M, phase, stride, sat)

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
        draw_tufts(img, A, t, w, False)
        cast = sc["cast"].values()
        for a in cast:
            if a.get("behind"):
                self.actor(img, a, t)
        hr = sc["hero"]
        rock, rx, ry = A.rock
        blit(img, rock, rx + hr["x"] - 540, ry + hr["y"] - 1420)
        eyes = prog(t, *hr["eyes"]) * (1 if t < hr["eyes_shut"] else 0)
        stamp(img, self.rabbit(t, w, eyes)(root(hr["x"], hr["y"], hr["scale"], 1.0)))
        for a in cast:
            if not a.get("behind"):
                self.actor(img, a, t)
        draw_tufts(img, A, t, w, True)
        return img

    def actor(self, img, a, t):
        if t < a["enter"]:
            return
        x, amp, sit, sq = animal(t, a["enter"], a["dur"], a["x0"], a["x1"])
        sw, sh, sdy = a["shadow"]
        blit(img, shadow(sw, sh), x - sw / 2, a["y"] - sdy)
        M = root(x, a["y"], a["scale"], sq, a["flip"])
        if a["kind"] == "fox":
            pose = self.fox(t * a["gait"], amp, sit, False, 0.0, math.sin(t * a.get("wag", 5)) * sit)
        else:
            pose = getattr(self, a["kind"])(t * a["gait"], amp, sit, False, 0.0)
        stamp(img, pose(M))

    def leaves(self, A, img, t, lv):
        for i in range(lv["n"]):
            p = (t - lv["start"] - i * lv["stagger"]) / lv["dur"]
            if not 0 < p < 1:
                continue
            x = -80 + p * (W + 160)
            y = 900 + (i * 97) % 520 + 90 * math.sin(p * 7 + i) - 120 * p
            sc = 1.3 + (i % 3) * 0.3
            flip = math.cos(p * 9 + i * 1.3)
            flip = math.copysign(max(0.18, abs(flip)), flip)
            stamp(img, [(leaf_mesh(A.leaf_cols[i % 4]), aff(x, y, p * 540 + i * 40, sc, sc * flip))])

    def scene_end(self, A, sc, tl, t, text=True):
        t = tl
        img = A.end_bg.copy()
        m, ic = sc["mascot"], sc["icon"]
        sw, sh, sdy = m["shadow"]
        blit(img, shadow(sw, sh), m["x"] - sw // 2, m["y"] - sdy)
        stamp(img, self.rabbit(t + m["clock"], m["wind"], 0)(root(m["x"], m["y"], m["scale"], 1.0)))
        p = clamp(back_out(prog(t, *ic["pop"]), 1.4), 0.01, 1.3)
        n = max(1, round(ic["size"] * p))
        sh = Image.new("RGBA", (n + 40, n + 40), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([20, 30, n + 19, n + 29], radius=int(n * 0.225), fill=(60, 40, 20, int(60 * clamp(p))))
        blit(img, sh, W / 2 - (n + 40) / 2 + 0, ic["y"] - (n + 40) / 2 + 12)
        blit(img, A.icon.resize((n, n), Image.LANCZOS), W / 2 - n / 2, ic["y"] - n / 2 + round(ic["bob"] * math.sin(t * 2)))
        if text:
            self.lines(img, sc.get("text", ()), t)
        return img
