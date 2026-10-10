"""python -m video.render <clip> --style <style> OUT.mp4
   python -m video.render <clip> --style <style> --preview DIR T1,T2,...   (PNG stills at those seconds)
   python -m video.render --list                                           (clips, styles and what renders)
"""
import argparse, os, pkgutil, sys

from .kit import core

HERE = os.path.dirname(os.path.abspath(__file__))


def names(pkg):
    return sorted(m.name for m in pkgutil.iter_modules([os.path.join(HERE, pkg)]) if not m.name.startswith("_") and m.name != "base")


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m video.render", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clip", nargs="?", choices=names("clips"))
    ap.add_argument("out", nargs="?", help="output .mp4")
    ap.add_argument("--style", choices=names("styles"))
    ap.add_argument("--preview", nargs=2, metavar=("DIR", "TIMES"))
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args(argv)
    if a.list:
        print("clips: ", " ".join(names("clips")))
        print("styles:", " ".join(names("styles")))
        return
    if not a.clip or not a.style or not (a.out or a.preview):
        ap.error("need <clip> --style <style> and OUT.mp4 or --preview DIR T1,T2")
    if a.preview:
        core.preview(a.clip, a.style, a.preview[0], [float(x) for x in a.preview[1].split(",")])
        return
    print(f"wrote {a.out} in {core.render(a.clip, a.style, a.out):.0f} s")


if __name__ == "__main__":
    sys.exit(main())
