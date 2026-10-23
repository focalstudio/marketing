"""Re-render the golden stills and rebuild goldens/sheet.png:  python3 -m video.tests.make_goldens [--sheet-only | --only STYLE,..]

Run this only when a change is meant to alter the pixels (a font, an icon, a style), then look at sheet.png before you
commit. Each cell is "before | after": the golden committed at HEAD, then the new render. Pairs without a golden (ink)
show only the new render.
"""
import io, os, subprocess, sys

from PIL import Image, ImageChops, ImageDraw

from video.kit import brand
from video.tests.test_kit import GOLD, PAIRS, TIMES, at, render

TW, TH, GAP, LABEL, HEAD = 162, 288, 12, 200, 40
BG, FG, DIM = (250, 248, 243), brand.INK, (150, 140, 130)


def head(path):
    """The file at HEAD, or None if it isn't committed there."""
    rel = os.path.relpath(path, brand.ROOT)
    try:
        return Image.open(io.BytesIO(subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=brand.ROOT, capture_output=True,
                                                    check=True).stdout)).convert("RGB")
    except (subprocess.CalledProcessError, OSError):
        return None


def main(argv):
    only = set(argv[argv.index("--only") + 1].split(",")) if "--only" in argv else None  # re-render just these styles' goldens
    rows = PAIRS + [("meditate", "ink")]
    sheet = Image.new("RGB", (LABEL + len(TIMES) * (2 * TW + GAP), HEAD + len(rows) * (TH + GAP)), BG)
    d = ImageDraw.Draw(sheet)
    for j, t in enumerate(TIMES):
        d.text((LABEL + j * (2 * TW + GAP) + 8, 10), f"{t:05.2f} s  before | after", font=brand.font(20, "SemiBold"), fill=FG)
    for i, (clip, style) in enumerate(rows):
        y = HEAD + i * (TH + GAP)
        d.text((8, y + TH // 2 - 12), f"{clip} × {style}", font=brand.font(20, "SemiBold"), fill=FG)
        for j, t in enumerate(TIMES):
            t = at(clip, t)
            x = LABEL + j * (2 * TW + GAP)
            path = os.path.join(GOLD, f"{clip}-{style}", f"{t:05.2f}.webp")
            old = head(path)
            if (clip, style) in PAIRS and "--sheet-only" not in argv and (only is None or style in only):
                _, new = render(clip, style, t)
                os.makedirs(os.path.dirname(path), exist_ok=True)
                if old is None or ImageChops.difference(old, new).getbbox():  # identical pixels: keep the file, no churn
                    new.save(path, lossless=True, quality=100, method=6)
            new = Image.open(path).convert("RGB") if (clip, style) in PAIRS else render(clip, style, t)[1]
            if old is None:
                d.text((x + 30, y + TH // 2 - 12), "new pair", font=brand.font(22), fill=DIM)
            else:
                sheet.paste(old.resize((TW, TH), Image.LANCZOS), (x, y))
            sheet.paste(new.resize((TW, TH), Image.LANCZOS), (x + TW, y))
        print(f"{clip} × {style}", file=sys.stderr)
    sheet.save(os.path.join(GOLD, "sheet.png"), optimize=True)


if __name__ == "__main__":
    main(sys.argv[1:])
