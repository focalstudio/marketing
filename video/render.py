"""python -m video.render <clip> --style <style> [--variant <v>] OUT.mp4
   python -m video.render <clip> --style <style> [--variant <v>] --preview DIR T1,T2,...   (PNG stills at those seconds)
   python -m video.render --list [--json]                                                 (clips, variants and styles)
"""
import argparse, importlib, json, os, pkgutil, sys

from .kit import core

HERE = os.path.dirname(os.path.abspath(__file__))


def names(pkg):
    return sorted(m.name for m in pkgutil.iter_modules([os.path.join(HERE, pkg)]) if not m.name.startswith("_") and m.name != "base")


def catalogue():
    clips = {c: dict(dur=importlib.import_module(f"video.clips.{c}").BOARD["dur"], variants=core.variants(c)) for c in names("clips")}
    return dict(clips=clips, styles=names("styles"))


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m video.render", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clip", nargs="?", choices=names("clips"))
    ap.add_argument("out", nargs="?", help="output .mp4")
    ap.add_argument("--style", choices=names("styles"))
    ap.add_argument("--variant")
    ap.add_argument("--preview", nargs=2, metavar=("DIR", "TIMES"))
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--json", action="store_true", help="with --list: machine-readable, for scripts/draft-week.mjs")
    a = ap.parse_args(argv)
    if a.list:
        cat = catalogue()
        if a.json:
            print(json.dumps(cat))
            return
        print("clips: ", " ".join(f"{c}[{','.join(v['variants'])}]" if v["variants"] else c for c, v in cat["clips"].items()))
        print("styles:", " ".join(cat["styles"]))
        return
    if not a.clip or not a.style or not (a.out or a.preview):
        ap.error("need <clip> --style <style> and OUT.mp4 or --preview DIR T1,T2")
    if a.preview:
        core.preview(a.clip, a.style, a.preview[0], [float(x) for x in a.preview[1].split(",")], a.variant)
        return
    print(f"wrote {a.out} in {core.render(a.clip, a.style, a.out, a.variant):.0f} s")


if __name__ == "__main__":
    sys.exit(main())
