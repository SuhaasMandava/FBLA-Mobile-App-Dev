"""
Builds TripHub's app icon, Android adaptive-icon layers, splash image, and favicon
from the supplied artwork, `assets/TripHub Icon.jpg` (the round Pin & Orbit icon at
the top of that sheet). See docs/design-system.md, section 5.

Run from the project root:  python scripts/make-icons.py
Needs Pillow (pip install pillow). Writes into assets/.

If the artwork changes, update CENTER and RADIUS to the round icon's position on the sheet.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SOURCE = ASSETS / "TripHub Icon.jpg"
SIZE = 1024

CENTER = (396, 357)  # the round icon's center on the source sheet, in pixels
RADIUS = 300  # just inside its rim, so the soft drop shadow around it is left out
FEATHER = 18  # soft edge where the disc meets the filled square
ART_HALF = 225  # half-width of the pin and its route dots, measured from CENTER


def disc(source):
    """The round icon cut out with a feathered circular edge, on transparent."""
    cx, cy = CENTER
    box = (cx - RADIUS, cy - RADIUS, cx + RADIUS, cy + RADIUS)
    art = source.crop(box).convert("RGBA")
    mask = Image.new("L", art.size, 0)
    ImageDraw.Draw(mask).ellipse((FEATHER, FEATHER, art.width - FEATHER, art.height - FEATHER), fill=255)
    art.putalpha(mask.filter(ImageFilter.GaussianBlur(FEATHER / 2)))
    return art


def rim_color(source):
    """Average navy just inside the rim, used for Android's solid background layer."""
    cx, cy = CENTER
    samples = []
    for dx, dy in [(-1, 0), (1, 0), (0, 1), (-0.7, 0.7), (0.7, 0.7), (-0.7, -0.7), (0.7, -0.7)]:
        x, y = round(cx + dx * (RADIUS - 30)), round(cy + dy * (RADIUS - 30))
        samples.append(source.getpixel((x, y)))
    return tuple(round(sum(c[i] for c in samples) / len(samples)) for i in range(3))


def extended(source, half):
    """
    The round icon grown into a square `half` pixels each side of CENTER: every pixel outside
    the disc repeats the color just inside the rim at the same angle, blurred, so the disc's own
    shading carries on to the corners with no visible seam.
    """
    src = np.asarray(source, dtype=np.float32)
    cx, cy = CENTER
    ys, xs = np.mgrid[-half:half, -half:half].astype(np.float32)
    r = np.hypot(xs, ys)
    edge = RADIUS - FEATHER - 6
    k = np.where(r > edge, edge / np.maximum(r, 1), 1.0)
    sx = np.clip(np.round(cx + xs * k), 0, source.width - 1).astype(int)
    sy = np.clip(np.round(cy + ys * k), 0, source.height - 1).astype(int)
    outside = Image.fromarray(src[sy, sx].astype(np.uint8)).filter(ImageFilter.GaussianBlur(24)).convert("RGBA")
    art = disc(source)
    outside.alpha_composite(art, (half - RADIUS, half - RADIUS))
    return outside


def square(source, art_fraction):
    """A full-bleed square with the artwork centered, the pin spanning `art_fraction` of its width."""
    half = round(ART_HALF / art_fraction)
    img = extended(source, half).resize((SIZE, SIZE), Image.LANCZOS)
    # A light sharpen offsets the softness from enlarging the source.
    return img.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)), rim_color(source)


def monochrome(source, art_fraction):
    """White silhouette of the light pin (and its route dots) for Android themed icons."""
    full, _ = square(source, art_fraction)
    gray = full.convert("L")
    mask = gray.point(lambda v: 255 if v > 170 else 0).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    out.putalpha(mask)
    return out


def main():
    source = Image.open(SOURCE).convert("RGB")

    # iOS / default icon: the pin fills about 70% of the square; the system applies the rounded mask.
    icon, navy = square(source, 0.70)
    icon.convert("RGB").save(ASSETS / "icon.png")

    # Android adaptive icon: same artwork smaller, inside the 66% safe zone, over a solid navy layer.
    foreground, _ = square(source, 0.50)
    foreground.save(ASSETS / "android-icon-foreground.png")
    Image.new("RGB", (SIZE, SIZE), navy).save(ASSETS / "android-icon-background.png")
    monochrome(source, 0.50).save(ASSETS / "android-icon-monochrome.png")

    # Splash: the round icon itself on transparent; app.json sets the light and dark backgrounds.
    splash = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    art = disc(source).resize((SIZE, SIZE), Image.LANCZOS)
    splash.alpha_composite(art)
    splash.save(ASSETS / "splash-icon.png")

    icon.resize((48, 48), Image.LANCZOS).convert("RGB").save(ASSETS / "favicon.png")
    print("navy fill", "#%02X%02X%02X" % navy)
    print("Wrote icon, adaptive icon layers, splash, and favicon to", ASSETS)


if __name__ == "__main__":
    main()
