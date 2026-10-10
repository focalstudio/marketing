"""Brand pieces every style shares: the exact app icon, the font and the brand colours.

The app comes from apps/<app>.yml (the one whose `clips:` lists the clip): `repo: org/Name` and `icon:`, a path inside
that repo. The icon is the real app icon, read from the app repo and only resized and corner-rounded, never redrawn or
stylised. The repo is APP_REPO_DIR (WILDFOCUS_REPO is an alias), else ../<Name> beside this repo.
The font is Nunito (OFL, video/fonts/); BRAND_FONT overrides it.
"""
import glob, os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
APPS = os.path.join(ROOT, "apps")
FONT = os.environ.get("BRAND_FONT") or os.path.join(ROOT, "video", "fonts", "Nunito[wght].ttf")
INK, SAGE = (52, 44, 38), (74, 124, 89)
_app = None


def _scalar(v):
    v = v.split(" #", 1)[0].strip()
    return v[1:-1] if len(v) > 1 and v[0] == v[-1] and v[0] in "\"'" else v


def app_config(app):
    """Top-level `key: value` scalars of apps/<app>.yml (enough for name, repo, ref, icon; no YAML dependency)."""
    out = {}
    with open(os.path.join(APPS, f"{app}.yml")) as f:
        for ln in f:
            if ln[:1].isalpha() and ":" in ln:
                k, v = ln.split(":", 1)
                if _scalar(v):
                    out[k.strip()] = _scalar(v)
    return out


def apps():
    return sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(APPS, "*.yml")))


def app_for(clip):
    """The app whose yml lists `clip` under `clips:`; with a single app, that app."""
    for app in apps():
        with open(os.path.join(APPS, f"{app}.yml")) as f:
            inside = False
            for ln in f:
                if ln[:1].isalpha():
                    inside = ln.startswith("clips:")
                elif inside and ln.strip().rstrip(":") == clip and ln.rstrip().endswith(":"):
                    return app
    if len(apps()) == 1:
        return apps()[0]
    raise SystemExit(f"no apps/*.yml lists clip {clip!r} under clips:")


def repo_dir(app):
    env = os.environ.get("APP_REPO_DIR") or os.environ.get("WILDFOCUS_REPO")
    return env or os.path.normpath(os.path.join(ROOT, "..", app_config(app)["repo"].split("/")[-1]))


def icon_path(app):
    return os.path.join(repo_dir(app), app_config(app)["icon"])


def use(app):
    """Make `app` the current one: rounded_icon() and app_name() read it. core.load calls this per clip."""
    global _app
    _app = app


def current():
    return _app or apps()[0]


def app_name(app=None):
    return app_config(app or current())["name"]


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def rounded_icon(size):
    im = Image.open(icon_path(current())).convert("RGBA")
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.225), fill=255)
    im.putalpha(m.resize((size, size), Image.LANCZOS))
    return im
