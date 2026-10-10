"""Brand pieces every style shares: the exact app icon, the font and the brand colours.

The icon is always the real WildFocus app icon (the full-bleed one from WildFocus#313), read from the app repo and only
resized and corner-rounded, never redrawn or stylised. Override the repo location with WILDFOCUS_REPO.
"""
import os
from PIL import Image, ImageDraw, ImageFont

REPO = os.environ.get("WILDFOCUS_REPO") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "WildFocus")
ICON = os.path.join(REPO, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
FONT = "/System/Library/Fonts/SFNSRounded.ttf"
INK, SAGE = (52, 44, 38), (74, 124, 89)


def font(size, weight="Bold"):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def rounded_icon(size):
    im = Image.open(ICON).convert("RGBA")
    im = im.resize((size, size), Image.LANCZOS)
    m = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * 0.225), fill=255)
    im.putalpha(m.resize((size, size), Image.LANCZOS))
    return im
