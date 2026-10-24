"""Species table for the drawn styles (paper, storybook): every animal the stories cast, as polygons you can pose.

Data and math only (stdlib, no Pillow). Each animal faces right and lives in a box W x 100 with its feet on y = 100.
SPECIES[name] = dict(w, colors, gait, pivots, parts). A part is (role, pts, anim, pivot):
  role   a key of the species' `colors` (a style may re-tone them)
  pts    polygon vertices in the box (ellipses are sampled with ell())
  anim   "" or a chain like "ear+head": rotated by angles[a] about its pivot, left to right (inner motion first)
  pivot  where the first rotation turns; None = SPECIES[name]["pivots"][first item]
Parts are listed back to front. pose(name, clock, moving) -> angles, parts(name, angles) -> [(role, pts)].
"""
import math

ANGLE_KEYS = ("head", "ear", "tail", "wing", "fleg", "bleg", "blink")


def ell(cx, cy, rx, ry, rot=0.0, n=26):
    c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    return [(cx + rx * math.cos(a) * c - ry * math.sin(a) * s, cy + rx * math.cos(a) * s + ry * math.sin(a) * c)
            for a in (2 * math.pi * i / n for i in range(n))]


def E(role, cx, cy, rx, ry, rot=0.0, anim="", pv=None):
    return (role, ell(cx, cy, rx, ry, rot), anim, pv)


def P(role, pts, anim="", pv=None):
    return (role, pts, anim, pv)


def leg(role, x, top, w, anim, foot=0.5):
    """A leg from (x, top) down to the ground, with a foot pointing right; it swings about its hip."""
    return (role, [(x - w / 2, top), (x + w / 2, top), (x + w / 2, 97), (x + w / 2 + w * foot, 97), (x + w / 2 + w * foot, 100), (x - w / 2, 100)], anim, (x, top))


def spikes(role, cx, cy, rx, ry, n=15, k=0.2, a0=170, a1=370):
    pts = []
    for i in range(n * 2 + 1):
        a = math.radians(a0 + (a1 - a0) * i / (n * 2))
        r = 1 + (k if i % 2 else 0)
        pts.append((cx + rx * r * math.cos(a), cy + ry * r * math.sin(a)))
    return (role, pts, "", None)


def stripes(role, xs, y0, y1, w, slant=6):
    return [P(role, [(x, y0), (x + w, y0), (x + w + slant, y1), (x + slant - w * 0.4, y1)]) for x in xs]


def dots(role, pts, r):
    return [E(role, x, y, r, r * 0.85) for x, y in pts]


def quad(w, colors, body, L, head, snout, ears, tail, extra=(), lw=7, gait="trot", neck=None, far=None):
    """Shared four-legged plan: body (cx, cy, rx, ry), leg length L, head (cx, cy, r), snout (length, height)."""
    bx, by, rx, ry = body
    hx, hy, hr = head
    top = by + ry * 0.4
    pv = {"head": (bx + rx * 0.75, by - ry * 0.3), "tail": (bx - rx * 0.85, by - ry * 0.1), "ear": (hx - hr * 0.2, hy - hr * 0.7)}
    far = colors.get("fur2", colors["fur"]) if far is None else far
    parts = [leg("fur2", bx + rx * 0.5, top, lw, "bleg", 0.6), leg("fur2", bx - rx * 0.55, top, lw, "fleg", 0.6)]
    parts += tail
    parts += [E("fur", bx, by, rx, ry)]
    parts += [E("belly", bx + 2, by + ry * 0.45, rx * 0.8, ry * 0.45)] if "belly" in colors else []
    parts += [leg("fur", bx + rx * 0.7, top, lw, "fleg", 0.6), leg("fur", bx - rx * 0.4, top, lw, "bleg", 0.6)]
    parts += list(extra)
    parts.append(P("fur", neck or [(bx + rx * 0.45, by - ry * 0.9), (hx - hr * 0.2, hy - hr * 0.5), (hx + hr * 0.3, hy + hr * 0.8), (bx + rx * 0.9, by + ry * 0.6)], "head"))
    parts += [e for e in ears]
    parts += [E("fur", hx, hy, hr, hr * 0.92, anim="head")]
    sl, sh = snout
    parts += [E("belly" if "belly" in colors else "fur", hx + hr * 0.8 + sl * 0.3, hy + hr * 0.25, sl * 0.6, sh * 0.5, anim="head"),
              E("dark", hx + hr * 0.8 + sl * 0.85, hy + hr * 0.1, sh * 0.28, sh * 0.24, anim="head"),
              E("eye", hx + hr * 0.3, hy - hr * 0.15, hr * 0.17, hr * 0.17, anim="blink+head", pv=None)]
    pv["blink"] = (hx + hr * 0.3, hy - hr * 0.15)
    return dict(w=w, colors=colors, gait=gait, pivots=pv, parts=parts)


def tri(role, a, b, c, anim="ear+head"):
    return P(role, [a, b, c], anim)


def bird_legs(role, xs, top, w=3.5):
    return [leg(role, x, top, w, "bleg" if i else "fleg", 1.6) for i, x in enumerate(xs)]


def _fox():
    c = dict(fur=(226, 120, 52), fur2=(150, 76, 40), belly=(250, 240, 224), dark=(48, 36, 32), eye=(40, 30, 28), tip=(250, 244, 232))
    tail = [E("fur", 16, 56, 22, 9, -28, "tail"), E("tip", 5, 66, 8, 6, -28, "tail")]
    ears = [tri("fur", (104, 30), (106, 5), (117, 28)), tri("dark", (108, 28), (108, 12), (114, 27))]
    s = quad(150, c, (66, 60, 36, 16), 24, (112, 40, 14), (22, 11), ears, tail, gait="trot")
    s["parts"].append(P("belly", [(78, 56), (96, 50), (102, 62), (88, 70)], ""))
    return s


def _wolf():
    c = dict(fur=(130, 134, 142), fur2=(84, 88, 98), belly=(206, 208, 212), dark=(34, 34, 40), eye=(230, 190, 70))
    tail = [E("fur", 14, 62, 22, 8, 32, "tail")]
    ears = [tri("fur", (106, 28), (108, 6), (118, 26)), tri("dark", (109, 26), (109, 12), (115, 25))]
    s = quad(156, c, (68, 58, 38, 17), 26, (116, 38, 14.5), (24, 12), ears, tail, lw=7.5)
    return s


def _lynx():
    c = dict(fur=(206, 170, 118), fur2=(150, 120, 84), belly=(240, 228, 208), dark=(40, 34, 30), eye=(40, 34, 30))
    tail = [E("fur", 24, 58, 9, 6, 20, "tail"), E("dark", 16, 60, 4, 6, 20, "tail")]
    ears = [tri("fur", (100, 26), (102, 4), (113, 24)), P("dark", [(101, 8), (102, 0), (105, 7)], "ear+head")]
    ex = dots("dark", [(52, 52), (64, 46), (74, 58), (46, 62), (58, 62)], 2.2)
    return quad(140, c, (62, 58, 34, 17), 25, (108, 40, 15), (14, 11), ears, tail, extra=ex, lw=7.5)


def _tiger():
    c = dict(fur=(230, 128, 40), fur2=(160, 84, 30), belly=(250, 240, 224), dark=(34, 28, 26), eye=(40, 30, 24))
    tail = [E("fur", 14, 54, 22, 6, -18, "tail"), E("dark", 6, 58, 6, 6, -18, "tail")]
    ears = [E("fur", 104, 26, 6, 6, 0, "ear+head"), E("dark", 104, 26, 3, 3, 0, "ear+head")]
    ex = stripes("dark", [42, 52, 62, 72, 82], 46, 70, 3.5)
    s = quad(160, c, (68, 56, 40, 19), 26, (116, 38, 15.5), (18, 13), ears, tail, extra=ex, lw=8.5)
    s["parts"].append(P("dark", [(108, 28), (114, 32), (108, 33)], "head"))
    return s


def _snow_leopard():
    c = dict(fur=(206, 206, 202), fur2=(150, 150, 150), belly=(240, 240, 236), dark=(52, 52, 56), eye=(120, 170, 110))
    tail = [E("fur", 14, 58, 28, 8.5, -22, "tail"), E("dark", 3, 48, 6, 8, -22, "tail")]
    ears = [E("fur", 108, 24, 6.5, 6.5, 0, "ear+head"), E("fur", 123, 28, 6, 6, 0, "ear+head"), E("dark", 108, 24, 3, 3, 0, "ear+head")]
    ex = dots("dark", [(44, 52), (54, 46), (64, 54), (74, 48), (84, 54), (50, 62), (66, 62), (80, 64)], 3.2)
    s = quad(160, c, (66, 60, 40, 18), 22, (118, 42, 17), (12, 13), ears, tail, extra=ex, lw=11)
    s["parts"] += dots("dark", [(112, 34), (120, 33), (126, 40)], 1.6)
    return s


def _polar_bear():
    c = dict(fur=(244, 242, 236), fur2=(204, 206, 206), dark=(40, 36, 40), eye=(40, 36, 40))
    tail = [E("fur", 26, 56, 5, 5, 0, "tail")]
    ears = [E("fur", 106, 22, 6, 6, 0, "ear+head"), E("fur2", 106, 22, 3, 3, 0, "ear+head")]
    return quad(150, c, (62, 56, 38, 21), 23, (108, 40, 16), (20, 14), ears, tail, lw=11)


def _red_panda():
    c = dict(fur=(176, 82, 40), fur2=(96, 48, 32), belly=(246, 240, 232), dark=(40, 28, 26), eye=(40, 28, 26), ring=(230, 170, 110))
    tail = [E("fur", 14, 60, 26, 9, 24, "tail")] + [E("ring", 8 + i * 9, 64 - i * 4, 3.5, 9, 24, "tail") for i in range(3)]
    ears = [E("fur", 102, 22, 7, 7, 0, "ear+head"), E("belly", 102, 22, 4, 4, 0, "ear+head")]
    s = quad(144, c, (58, 60, 32, 17), 24, (104, 42, 15), (12, 10), ears, tail, lw=8)
    s["parts"] += [E("belly", 100, 42, 4, 6, -20, "head"), E("belly", 114, 44, 3, 5, 20, "head")]
    return s


def _goat():
    c = dict(fur=(224, 192, 150), fur2=(150, 120, 90), belly=(248, 242, 230), dark=(50, 40, 36), eye=(40, 34, 30), horn=(120, 98, 76))
    tail = [tri("fur", (28, 44), (22, 36), (34, 48), "tail")]
    ears = [E("fur", 98, 28, 8, 3.5, -20, "ear+head"), P("horn", [(108, 24), (104, 2), (110, 6), (112, 22)], "ear+head")]
    s = quad(122, c, (58, 52, 30, 14), 34, (108, 28, 11), (14, 9), ears, tail, lw=5, gait="trot")
    s["parts"].append(P("belly", [(112, 36), (116, 52), (110, 46)], "head"))
    return s


def _sheep():
    c = dict(fur=(246, 242, 232), fur2=(60, 52, 50), dark=(60, 52, 50), eye=(240, 240, 240), wool=(250, 248, 240))
    pv = {"head": (88, 54), "tail": (22, 50), "ear": (92, 38), "blink": (104, 46)}
    parts = [leg("fur2", 38, 70, 7, "bleg", 0.6), leg("fur2", 78, 70, 7, "fleg", 0.6), leg("fur2", 50, 70, 7, "fleg", 0.6), leg("fur2", 68, 70, 7, "bleg", 0.6)]
    parts += [E("wool", x, y, r, r) for x, y, r in [(32, 52, 17), (52, 46, 19), (72, 50, 17), (44, 62, 17), (62, 62, 17), (22, 60, 11), (80, 62, 11)]]
    parts += [E("fur2", 108, 42, 12, 11, anim="head"), E("fur2", 96, 32, 7, 3.5, -30, "ear+head"), E("wool", 100, 28, 8, 6, 0, "head"),
              E("eye", 112, 40, 2.4, 2.4, anim="blink+head"), E("dark", 120, 46, 2.6, 2, anim="head")]
    return dict(w=130, colors=c, gait="trot", pivots=pv, parts=parts)


def _squirrel():
    c = dict(fur=(196, 96, 48), fur2=(140, 66, 38), belly=(248, 236, 218), dark=(44, 32, 28), eye=(36, 28, 26), nut=(120, 84, 52))
    pv = {"head": (50, 56), "tail": (30, 80), "ear": (52, 30), "blink": (62, 38)}
    parts = [E("fur", 24, 52, 15, 38, 12, "tail"), E("fur2", 16, 38, 10, 24, 14, "tail"), E("fur", 22, 20, 12, 14, 20, "tail"),
             E("fur", 40, 74, 20, 25), E("belly", 52, 74, 11, 20), E("fur2", 34, 88, 14, 10), P("fur2", [(36, 96), (60, 96), (60, 100), (36, 100)]),
             E("fur", 58, 40, 15, 14, anim="head"), tri("fur", (50, 30), (50, 10), (60, 28)), tri("fur", (62, 28), (68, 10), (70, 30)),
             E("belly", 68, 46, 8, 6, anim="head"), E("dark", 75, 43, 2.6, 2.4, anim="head"), E("eye", 63, 37, 2.4, 2.4, anim="blink+head"),
             E("nut", 62, 70, 6, 7), E("fur2", 58, 66, 4, 3)]
    return dict(w=94, colors=c, gait="hop", pivots=pv, parts=parts)


def _mouse():
    c = dict(fur=(170, 168, 176), fur2=(120, 118, 128), belly=(232, 228, 224), dark=(54, 48, 54), eye=(30, 26, 30), pink=(236, 170, 180))
    pv = {"head": (74, 68), "tail": (30, 80), "ear": (80, 48), "blink": (94, 66)}
    parts = [P("pink", [(34, 82), (6, 90), (0, 70), (4, 74), (10, 84), (34, 87)], "tail"),
             leg("fur2", 44, 84, 6, "bleg", 1.2), leg("fur2", 70, 84, 6, "fleg", 1.2),
             E("fur", 48, 74, 28, 20), E("belly", 56, 82, 18, 10),
             leg("fur", 38, 86, 7, "bleg", 1.2), leg("fur", 62, 86, 7, "fleg", 1.2),
             E("fur2", 82, 50, 11, 11, 0, "ear+head"), E("pink", 82, 50, 6, 6, 0, "ear+head"),
             E("fur", 88, 66, 15, 12, anim="head"), E("belly", 100, 72, 9, 6, anim="head"),
             E("pink", 108, 69, 3, 2.6, anim="head"), E("eye", 92, 62, 2.6, 2.6, anim="blink+head")]
    return dict(w=114, colors=c, gait="trot", pivots=pv, parts=parts)


def _hedgehog():
    c = dict(fur=(120, 92, 66), fur2=(78, 58, 44), belly=(236, 214, 178), dark=(44, 32, 28), eye=(30, 24, 22))
    pv = {"head": (88, 78), "tail": (20, 80), "ear": (92, 64), "blink": (104, 76)}
    parts = [leg("fur2", 44, 88, 6, "bleg", 1), leg("fur2", 82, 88, 6, "fleg", 1),
             spikes("fur2", 56, 82, 42, 54, 17, 0.17, 172, 368), spikes("fur", 56, 86, 38, 46, 15, 0.14, 178, 362),
             E("belly", 98, 84, 18, 12, anim="head"), E("fur", 90, 72, 14, 9, 10, "head"), E("fur2", 90, 66, 6, 5, 0, "ear+head"),
             E("dark", 114, 84, 3.2, 2.8, anim="head"), E("eye", 104, 77, 2.6, 2.6, anim="blink+head"),
             leg("fur", 58, 90, 7, "fleg", 1), leg("fur", 36, 90, 7, "bleg", 1)]
    return dict(w=124, colors=c, gait="trot", pivots=pv, parts=parts)


def _rabbit():
    c = dict(fur=(238, 236, 232), fur2=(204, 200, 198), belly=(252, 250, 246), dark=(60, 50, 54), eye=(50, 40, 46), pink=(240, 170, 182))
    pv = {"head": (50, 58), "tail": (22, 78), "ear": (52, 30), "blink": (63, 40)}
    parts = [E("fur2", 54, 12, 5.5, 19, -8, "ear+head"), E("pink", 54, 13, 2.8, 14, -8, "ear+head"),
             E("fur", 40, 72, 25, 26), E("belly", 53, 70, 12, 20), E("fur2", 32, 82, 20, 17),
             P("fur", [(36, 96), (68, 96), (68, 100), (36, 100)]),
             E("fur", 22, 80, 8, 8, 0, "tail"),
             E("fur2", 64, 10, 5.5, 19, 6, "ear+head"), E("pink", 64, 11, 2.8, 14, 6, "ear+head"),
             E("fur", 59, 42, 15, 13, anim="head"), E("belly", 70, 47, 9, 6, anim="head"),
             E("pink", 75, 44, 2.8, 2.4, anim="head"), E("eye", 64, 38, 2.4, 2.4, anim="blink+head"),
             E("fur", 60, 94, 8, 5)]
    return dict(w=92, colors=c, gait="hop", pivots=pv, parts=parts)


def _deer():
    c = dict(fur=(190, 134, 84), fur2=(130, 88, 58), belly=(240, 222, 196), dark=(50, 38, 32), eye=(40, 30, 26), horn=(120, 90, 62), spot=(250, 240, 222))
    ears = [E("fur", 96, 12, 8, 3.5, -30, "ear+head"), E("fur2", 102, 11, 8, 3.5, 15, "ear+head")]
    horns = [P("horn", [(98, 6), (92, 0), (94, 0), (101, 5)], "head"), P("horn", [(104, 6), (112, 0), (110, 0), (102, 5)], "head"),
             P("horn", [(96, 5), (88, 6), (88, 4), (96, 3)], "head"), P("horn", [(106, 5), (115, 7), (115, 5), (106, 3)], "head")]
    neck = [(72, 44), (88, 12), (100, 16), (88, 52)]
    ex = dots("spot", [(40, 44), (50, 40), (60, 46), (46, 52), (68, 40)], 2.3)
    s = quad(124, c, (54, 52, 32, 14), 36, (100, 14, 8), (11, 7), ears + horns, [E("belly", 22, 46, 4, 6, 20, "tail")], extra=ex, lw=5.5, neck=neck)
    return s


def _otter():  # standing up on its hind legs, paws at its chest, tail on the ground: the pose people know
    c = dict(fur=(122, 84, 56), fur2=(86, 56, 38), belly=(234, 212, 178), dark=(40, 30, 28), eye=(30, 24, 22))
    pv = {"head": (50, 40), "tail": (40, 92), "ear": (44, 14), "blink": (55, 19), "fleg": (56, 50)}
    whisker = lambda y0, y1: P("dark", [(64, y0), (80, y1), (80, y1 + 1.2), (64, y0 + 1.2)], "head")
    parts = [P("fur2", [(42, 84), (20, 91), (2, 98), (4, 100), (24, 100), (46, 98)], "tail"),
             E("fur2", 44, 97, 10, 4), E("fur", 48, 66, 20, 32), E("belly", 55, 64, 12, 25), E("fur", 60, 97, 11, 4),
             E("fur2", 50, 58, 6, 4.5, 20, "fleg"), E("fur2", 62, 56, 6, 4.5, -20, "fleg"),
             E("fur2", 41, 14, 3.6, 3.6, 0, "ear+head"), E("fur2", 63, 12, 3.6, 3.6, 0, "ear+head"),
             E("fur", 53, 25, 16, 14, anim="head"), E("belly", 60, 31, 11, 7.5, anim="head"),
             E("dark", 64, 27, 3.6, 2.8, anim="head"), E("eye", 48, 20, 2.3, 2.3, anim="blink+head"), E("eye", 60, 19, 2.3, 2.3, anim="blink+head"),
             whisker(31, 29), whisker(33, 35)]
    return dict(w=96, colors=c, gait="hop", pivots=pv, parts=parts)


def _duck():
    c = dict(fur=(150, 128, 106), fur2=(120, 100, 82), belly=(238, 232, 220), dark=(44, 40, 36), eye=(30, 26, 24), head=(40, 120, 78), bill=(238, 196, 60), foot=(230, 150, 50), ring=(250, 250, 246))
    pv = {"head": (74, 56), "tail": (22, 70), "wing": (50, 66), "blink": (84, 36), "ear": (74, 56)}
    parts = bird_legs("foot", [46, 60], 84, 4) + [
        E("fur2", 24, 66, 14, 8, -24, "tail"), E("fur", 48, 72, 30, 20), E("belly", 52, 82, 22, 9), E("fur2", 46, 70, 17, 10, -10, "wing"),
        E("fur2", 70, 62, 11, 15, -20), P("head", [(66, 52), (78, 52), (82, 42), (68, 40)], "head"), E("ring", 72, 53, 9, 2.5, -10, "head"),
        E("head", 76, 32, 12, 12, anim="head"), E("bill", 91, 36, 10, 4, 5, "head"), E("eye", 80, 28, 2.4, 2.4, anim="blink+head")]
    return dict(w=106, colors=c, gait="waddle", pivots=pv, parts=parts)


def _goose():
    c = dict(fur=(170, 156, 138), fur2=(134, 120, 106), belly=(238, 232, 222), dark=(46, 40, 38), eye=(30, 26, 24), bill=(240, 150, 50), foot=(240, 150, 50))
    pv = {"head": (88, 54), "tail": (20, 66), "wing": (50, 62), "blink": (104, 14), "ear": (88, 54)}
    parts = bird_legs("foot", [52, 66], 80, 4) + [
        P("fur2", [(22, 64), (6, 56), (14, 72)], "tail"), E("fur", 50, 66, 32, 20), E("belly", 56, 76, 24, 10), E("fur2", 48, 64, 20, 11, -8, "wing"),
        P("fur", [(78, 60), (88, 62), (98, 16), (88, 14)], "head"), E("fur", 94, 11, 10, 8, anim="head"),
        E("bill", 106, 14, 9, 3.6, 8, "head"), E("eye", 98, 9, 2.2, 2.2, anim="blink+head")]
    return dict(w=118, colors=c, gait="waddle", pivots=pv, parts=parts)


def _chicken():
    c = dict(fur=(176, 80, 40), fur2=(120, 52, 32), belly=(214, 130, 70), dark=(40, 30, 28), eye=(30, 24, 22), bill=(240, 190, 60), foot=(230, 170, 60), comb=(220, 50, 50))
    pv = {"head": (66, 54), "tail": (26, 58), "wing": (46, 64), "blink": (80, 34), "ear": (66, 54)}
    parts = bird_legs("foot", [44, 58], 82, 3.6) + [
        P("fur2", [(30, 62), (4, 16), (14, 8), (22, 18), (36, 54)], "tail"), P("dark", [(30, 60), (10, 30), (20, 26), (36, 52)], "tail"),
        E("fur", 48, 68, 25, 20), E("belly", 60, 74, 12, 14), E("fur2", 44, 66, 15, 11, -6, "wing"),
        E("fur", 68, 52, 9, 12, -10), E("fur", 74, 34, 10, 10, anim="head"),
        E("comb", 70, 24, 4, 4.5, 0, "head"), E("comb", 76, 22, 4, 5, 0, "head"), E("comb", 81, 25, 3.6, 4, 0, "head"),
        P("bill", [(82, 33), (94, 38), (82, 42)], "head"), E("comb", 82, 46, 3, 5, 0, "head"), E("eye", 77, 31, 2.2, 2.2, anim="blink+head")]
    return dict(w=100, colors=c, gait="waddle", pivots=pv, parts=parts)


def _owl():
    c = dict(fur=(150, 106, 66), fur2=(104, 70, 46), belly=(236, 214, 176), dark=(44, 32, 28), eye=(250, 196, 60), pupil=(30, 24, 22), bill=(224, 170, 60), foot=(224, 170, 60))
    pv = {"head": (50, 40), "tail": (50, 96), "wing": (30, 50), "blink": (50, 30), "ear": (50, 20)}
    parts = bird_legs("foot", [42, 58], 92, 5)[:2] + [
        E("fur", 50, 66, 28, 34), E("belly", 50, 72, 17, 26),
        E("fur2", 24, 64, 10, 27, 8, "wing"), E("fur2", 76, 64, 10, 27, -8, "wing"),
        tri("fur2", (32, 22), (28, 2), (44, 14), "ear+head"), tri("fur2", (68, 22), (72, 2), (56, 14), "ear+head"),
        E("fur", 50, 30, 24, 20, anim="head"), E("belly", 38, 30, 11, 12, anim="head"), E("belly", 62, 30, 11, 12, anim="head"),
        E("eye", 38, 30, 7, 7, anim="blink+head"), E("eye", 62, 30, 7, 7, anim="blink+head"),
        E("pupil", 38, 30, 3.4, 3.4, anim="blink+head"), E("pupil", 62, 30, 3.4, 3.4, anim="blink+head"),
        P("bill", [(46, 34), (54, 34), (50, 46)], "head")]
    return dict(w=100, colors=c, gait="flap", pivots=pv, parts=parts)


def _bat():
    c = dict(fur=(86, 66, 76), fur2=(58, 44, 56), belly=(120, 94, 100), dark=(34, 26, 32), eye=(250, 220, 120))
    pv = {"head": (50, 44), "wing": (46, 52), "ear": (50, 30), "blink": (50, 40), "tail": (50, 80)}
    parts = [P("fur2", [(48, 50), (22, 24), (0, 34), (8, 44), (14, 40), (20, 58), (28, 54), (36, 74), (48, 66)], "wing"),
             P("fur2", [(52, 50), (78, 24), (100, 34), (92, 44), (86, 40), (80, 58), (72, 54), (64, 74), (52, 66)], "wing"),
             E("fur", 50, 62, 12, 20), E("belly", 50, 66, 7, 14),
             tri("fur", (41, 36), (38, 18), (47, 32), "ear+head"), tri("fur", (59, 36), (62, 18), (53, 32), "ear+head"),
             E("fur", 50, 42, 11, 10, anim="head"), E("belly", 50, 46, 6, 5, anim="head"),
             E("eye", 45, 40, 2.2, 2.2, anim="blink+head"), E("eye", 55, 40, 2.2, 2.2, anim="blink+head"), E("dark", 50, 45, 1.8, 1.6, anim="head")]
    return dict(w=100, colors=c, gait="flap", pivots=pv, parts=parts)


def _frog():
    c = dict(fur=(110, 168, 70), fur2=(70, 118, 54), belly=(226, 232, 150), dark=(40, 56, 36), eye=(250, 246, 220), pupil=(30, 30, 24))
    pv = {"head": (50, 70), "tail": (50, 80), "ear": (50, 50), "blink": (50, 40), "wing": (50, 70)}
    parts = [P("fur2", [(18, 98), (6, 78), (24, 64), (36, 76), (40, 98)], "bleg", (30, 70)),
             E("fur", 52, 72, 30, 24), E("belly", 56, 82, 20, 14),
             P("fur2", [(90, 98), (92, 84), (78, 70), (66, 86), (68, 98)], "fleg", (78, 76)),
             E("fur", 66, 50, 24, 18, anim="head"), E("dark", 82, 56, 8, 1.6, 8, "head"),
             E("fur2", 50, 34, 11, 11, anim="head"), E("fur2", 76, 34, 11, 11, anim="head"),
             E("eye", 50, 33, 7, 7, anim="blink+head"), E("eye", 76, 33, 7, 7, anim="blink+head"),
             E("pupil", 52, 33, 3.2, 3.2, anim="blink+head"), E("pupil", 78, 33, 3.2, 3.2, anim="blink+head")]
    return dict(w=100, colors=c, gait="hop", pivots=pv, parts=parts)


def _sea_turtle():
    c = dict(fur=(120, 138, 84), fur2=(86, 100, 60), belly=(222, 208, 150), dark=(44, 50, 36), eye=(30, 28, 24), shell=(150, 112, 62), shell2=(112, 80, 48))
    pv = {"head": (88, 66), "tail": (14, 74), "wing": (64, 74), "ear": (88, 66), "blink": (102, 60)}
    parts = [E("fur2", 24, 82, 9, 4, -20, "tail"), E("fur2", 58, 84, 22, 6, -30, "wing"),
             E("belly", 52, 74, 36, 10), E("shell", 50, 56, 38, 28), E("shell2", 50, 56, 26, 18),
             E("shell", 36, 54, 8, 8), E("shell", 64, 54, 8, 8), E("shell", 50, 42, 8, 7), E("shell", 50, 68, 8, 6),
             E("fur", 100, 62, 14, 9, -10, "head"), E("fur", 88, 66, 10, 8, 0, "head"), E("eye", 105, 59, 2.2, 2.2, anim="blink+head"),
             E("fur", 74, 84, 22, 6, 24, "wing")]
    return dict(w=118, colors=c, gait="crawl", pivots=pv, parts=parts)


SPECIES = {n: f() for n, f in dict(
    rabbit=_rabbit, fox=_fox, deer=_deer, hedgehog=_hedgehog, owl=_owl, bat=_bat, squirrel=_squirrel, mouse=_mouse,
    duck=_duck, frog=_frog, otter=_otter, sea_turtle=_sea_turtle, snow_leopard=_snow_leopard, lynx=_lynx, wolf=_wolf,
    polar_bear=_polar_bear, red_panda=_red_panda, tiger=_tiger, chicken=_chicken, goat=_goat, goose=_goose, sheep=_sheep,
).items()}


def pose(name, clock, moving=False):
    """Joint angles in degrees (blink: 1 open .. 0.1 closed) for an animal at `clock` seconds; `moving` = walking/hopping/flying."""
    sp = SPECIES[name]
    s = sum(map(ord, name)) % 11
    c = clock * 2 * math.pi
    a = dict.fromkeys(ANGLE_KEYS, 0.0)
    a["head"] = 2.5 * math.sin(clock * 1.3 + s)
    a["tail"] = 9 * math.sin(clock * 3.1 + s)
    a["ear"] = 9 * max(0.0, math.sin(clock * 0.8 + s)) ** 8 * (1 if s % 2 else -1)
    a["blink"] = 0.1 if (clock + s * 0.37) % 3.4 < 0.12 else 1.0
    g = sp["gait"]
    if moving:
        if g == "flap":
            a["wing"] = 38 * math.sin(c * 2.4 + s)
        elif g == "hop":
            a["fleg"] = a["bleg"] = 24 * math.sin(c * 1.6)
            a["head"] += 4 * math.sin(c * 1.6)
        elif g == "crawl":
            a["wing"] = 24 * math.sin(c * 1.4)
        else:
            a["fleg"], a["bleg"] = 26 * math.sin(c * 1.9), -26 * math.sin(c * 1.9)
            a["head"] += 3 * math.sin(c * 3.8)
    elif g == "flap":
        a["wing"] = 2 * math.sin(clock * 2 + s)
    return a


def _rot(pts, pv, deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [(pv[0] + (x - pv[0]) * c - (y - pv[1]) * s, pv[1] + (x - pv[0]) * s + (y - pv[1]) * c) for x, y in pts]


def parts(name, angles):
    """-> [(role, polygon)] back to front with the angles applied (blink squashes a part about its pivot)."""
    sp = SPECIES[name]
    out = []
    for role, pts, anim, pv in sp["parts"]:
        for i, key in enumerate(anim.split("+") if anim else ()):
            p = pv if (i == 0 and pv) else sp["pivots"].get(key, (0, 0))
            if key == "blink":
                pts = [(x, p[1] + (y - p[1]) * angles["blink"]) for x, y in pts]
            else:
                pts = _rot(pts, p, angles.get(key, 0.0))
        out.append((role, pts))
    return out
