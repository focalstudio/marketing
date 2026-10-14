"""Brand pieces every style shares: the exact app icon, the font and the brand colours.

The app comes from apps/<app>.yml (the one whose `clips:` lists the clip): `repo: org/Name` and `icon:`, a path inside
that repo. The icon is the real app icon, read from the app repo and only resized and corner-rounded, never redrawn or
stylised. The repo is APP_REPO_DIR (WILDFOCUS_REPO is an alias; one checkout for every app), else
APPS_DIR/<Name> (one folder holding a checkout per app, as CI does), else ../<Name> beside this repo.
`assets:` (backdrop, cast glob, hero) are paths inside the same repo, for styles that use the app's own art.
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


def app_section(app, key):
    """The indented `k: v` scalars under the top-level `key:` of apps/<app>.yml, as a dict ({} if absent)."""
    out, inside = {}, False
    with open(os.path.join(APPS, f"{app}.yml")) as f:
        for ln in f:
            if ln[:1].isalpha():
                inside = ln.split(":", 1)[0] == key
            elif inside and ln[:1] in " \t" and ":" in ln and ln.strip()[:1] != "#":
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
    name = app_config(app)["repo"].split("/")[-1]
    return env or os.path.normpath(os.path.join(os.environ.get("APPS_DIR") or os.path.join(ROOT, ".."), name))


def icon_path(app):
    return os.path.join(repo_dir(app), app_config(app)["icon"])


def asset_path(kind, app=None):
    """A single `assets:` file (backdrop, hero) of the app, inside its repo."""
    app = app or current()
    rel = app_section(app, "assets").get(kind)
    if not rel:
        raise SystemExit(f"apps/{app}.yml has no assets.{kind}")
    p = os.path.join(repo_dir(app), rel)
    if not os.path.exists(p):
        raise SystemExit(f"assets.{kind} of {app} not found at {p} (set APPS_DIR or APP_REPO_DIR)")
    return p


def cast_paths(app=None):
    """{name: path} for every PNG matched by `assets.cast`, named by file stem."""
    app = app or current()
    pat = app_section(app, "assets").get("cast")
    if not pat:
        raise SystemExit(f"apps/{app}.yml has no assets.cast")
    return {os.path.splitext(os.path.basename(p))[0]: p for p in sorted(glob.glob(os.path.join(repo_dir(app), pat)))}


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
