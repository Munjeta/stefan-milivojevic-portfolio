"""Builds the blurred site backgrounds from bg-source/bg-code-original.jpg.

Run from the project root:   python bg-source/make-bg.py
Needs Pillow and numpy (already present in this environment, not a project dependency).

Output (src/assets/bg/):  bg-dark-1920.webp  bg-dark-900.webp  bg-light-1920.webp  bg-light-900.webp
The blur is baked into the pixels, so the page never needs a CSS filter on a large element.
The darkening/lightening overlay on top is done in CSS (see "SITE BACKGROUND" in src/style.css).
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "bg-source" / "bg-code-original.jpg"
OUT = ROOT / "src" / "assets" / "bg"

# ---- knobs ---------------------------------------------------------------
BLUR_1920 = 20     # gaussian radius in px at 1920 wide (the 900 wide version is scaled to look the same)
GAIN = 1.0         # >1 brightens the glow, <1 dims it (before the CSS overlay is applied)
QUALITY = 70       # WebP quality
GLOW_PERCENTILE = 96   # lower = code lines reach full brightness sooner (more contrast), the brightest spots just clip
DARK_STRENGTH = 0.65   # how much of the cream the brightest glow reaches (dark theme)
LIGHT_STRENGTH = 0.55  # how much of the ink the strongest strokes reach (light theme)
SIZES = {"1920": 1920, "900": 900}

# Site colours (src/style.css :root). Nothing new is introduced.
INK = np.array([11, 12, 14], dtype=float)         # --ink
CREAM = np.array([242, 241, 238], dtype=float)    # --cream
# --------------------------------------------------------------------------


def luminance(img):
    a = np.asarray(img.convert("L"), dtype=float) / 255.0
    return a


def build(size_key, width):
    im = Image.open(SRC).convert("RGB")
    h = round(im.height * width / im.width)
    im = im.resize((width, h), Image.LANCZOS)
    sigma = BLUR_1920 * width / 1920
    im = im.filter(ImageFilter.GaussianBlur(sigma))
    lum = luminance(im)
    # normalise so the brightest (100 - GLOW_PERCENTILE)% of the blurred photo maps to 1.0, then apply the gain.
    # Colour is dropped on purpose: only the photo's light/dark structure is used, painted in the site's own colours.
    glow = np.clip(lum / np.percentile(lum, GLOW_PERCENTILE), 0, 1) ** 0.9
    glow = np.clip(glow * GAIN, 0, 1)

    # dark: ink-coloured base, glow in neutral cream
    dark = INK[None, None, :] + (CREAM - INK)[None, None, :] * glow[..., None] * DARK_STRENGTH
    # light: cream base, glow becomes pale ink-grey strokes (same photo, inverted roles)
    light = CREAM[None, None, :] + (INK - CREAM)[None, None, :] * glow[..., None] * LIGHT_STRENGTH

    for name, arr in (("dark", dark), ("light", light)):
        out = Image.fromarray(np.clip(arr, 0, 255).astype("uint8"), "RGB")
        path = OUT / f"bg-{name}-{size_key}.webp"
        out.save(path, "WEBP", quality=QUALITY, method=6)
        print(path.name, out.size, path.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for key, w in SIZES.items():
        build(key, w)
