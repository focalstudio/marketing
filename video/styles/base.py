"""The contract every style implements. Clips call only scene(); scenes call the pose API on their own style.

Scene kinds a clip may use: "title" (text on a plain backdrop), "world" (landscape, hero, cast, camera, weather, text),
"end" (end card: mascot, the exact app icon, text). A style that cannot draw a kind or feature raises Unsupported.

Pose API, shared by every style (each returns the style's own drawable):
    rabbit(t, wind, eyes)                                        t: idle clock s, wind 0..1, eyes 0 closed..1 open
    fox(phase, stride, sat, blink, tilt, wag=0.0, squash=0.0)    phase: gait clock rad, stride 0..1, sat 0 walking..1 sitting,
    deer(phase, stride, sat, blink, tilt, squash=0.0)            blink bool, tilt deg, wag -1..1, squash: landing bounce
    hedgehog(phase, stride, sat, blink, tilt, squash=0.0)        (styles may apply squash when placing the sprite instead)
"""
from PIL import Image

from ..kit.ease import ease_out, prog

POSES = ("rabbit", "fox", "deer", "hedgehog")
SCENES = ("title", "world", "end")


class Unsupported(NotImplementedError):
    pass


class Style:
    name = "base"
    stateful = False  # True: frames depend on the previous ones and must be rendered in order (advance)

    def assets(self):
        raise Unsupported(f"style {self.name} has no assets")

    def scene(self, A, sc, tl, t, text=True):
        """Draw scene `sc` at scene-local time tl (t is the clip time). -> the style's canvas."""
        fn = getattr(self, "scene_" + sc["kind"], None)
        if fn is None:
            raise Unsupported(f"style {self.name} cannot draw a '{sc['kind']}' scene")
        return fn(A, sc, tl, t, text)

    def transition(self, a, b, u):
        return Image.blend(a, b, u)

    def to_rgb(self, cv, check=False):
        return cv.convert("RGB")

    def reset(self, A, board):
        """Start a render (or a preview still) from frame 0."""
        pass

    def advance(self, A, i):
        """Bring state up to frame i; called before every frame, in order."""
        pass

    def lines(self, cv, groups, t):
        """Draw every text group visible at t. A group fades as a whole; each line animates via text_line."""
        for g in groups:
            show = g.get("show")
            if show and not show[0] <= t < show[1]:
                continue
            a = ease_out(prog(t, *g["fade_in"])) if g.get("fade_in") else 1.0
            if g.get("fade_out"):
                a *= 1 - prog(t, *g["fade_out"])
            for ln in g["lines"]:
                self.text_line(cv, ln, t, a)

    def text_line(self, cv, ln, t, a):
        raise Unsupported(f"style {self.name} cannot draw text")

    def rabbit(self, t, wind, eyes):
        raise Unsupported(f"style {self.name} has no rabbit")

    def fox(self, phase, stride, sat, blink, tilt, wag=0.0, squash=0.0):
        raise Unsupported(f"style {self.name} has no fox")

    def deer(self, phase, stride, sat, blink, tilt, squash=0.0):
        raise Unsupported(f"style {self.name} has no deer")

    def hedgehog(self, phase, stride, sat, blink, tilt, squash=0.0):
        raise Unsupported(f"style {self.name} has no hedgehog")
