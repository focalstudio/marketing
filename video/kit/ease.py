"""Easing and timing helpers shared by every clip and style. Pure functions of floats."""
import math



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


def gust(t, w):
    """Wind strength 0..1 at t for a storyboard wind spec: a steady base plus one gaussian gust."""
    return w["base"] + w["amp"] * math.exp(-(((t - w["peak"]) / w["width"]) ** 2))
