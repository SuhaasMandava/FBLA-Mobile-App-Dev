"""
Draws TripHub's app icon, Android adaptive-icon layers, splash images, and favicon
from one geometry: the Pin & Crew mark. A map pin holds three dots (the group),
reached by a dotted route, on a midnight-to-sunset field. See docs/design-system.md, section 5.

Run from the project root:  python scripts/make-icons.py
Needs Pillow (pip install pillow). Writes into assets/.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SIZE = 1024
SS = 4  # supersampling factor for smooth edges
BIG = SIZE * SS

NAVY_DEEP = (7, 14, 34)  # #070E22
NAVY = (21, 43, 92)  # #152B5C
NAVY_LIGHT = (44, 79, 154)  # #2C4F9A
CORAL = (255, 138, 122)  # #FF8A7A
GOLD = (255, 200, 87)  # #FFC857
WHITE = (255, 255, 255)
BLUSH = (251, 233, 228)  # #FBE9E4, the pin's lower edge
INK_LIGHT = (238, 241, 247)  # #EEF1F7

# Geometry in 1024 design units.
PIN_CENTER = (512, 430)
PIN_RADIUS = 230
PIN_TIP = 800
CREW = [((512, 365), 62), ((452, 470), 62), ((572, 470), 62)]
ROUTE = [(150, 900), (330, 760), (512, 812)]  # quadratic Bezier into the pin's tip
ROUTE_DOTS = 7
ROUTE_DOT_RADIUS = 15


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def bezier(t, p0, p1, p2):
    u = 1 - t
    return (u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1])


class Space:
    """Maps 1024 design units onto the supersampled canvas, scaled about `origin`."""

    def __init__(self, scale=1.0, origin=(512, 560)):
        self.scale, self.origin = scale, origin

    def p(self, x, y):
        ox, oy = self.origin
        return ((ox + (x - ox) * self.scale) * SS, (oy + (y - oy) * self.scale + (512 - oy) * (1 - self.scale)) * SS)

    def r(self, v):
        return v * self.scale * SS


def circle(draw, center, radius, fill):
    x, y = center
    draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def pin_mask(space):
    mask = Image.new("L", (BIG, BIG), 0)
    d = ImageDraw.Draw(mask)
    cx, cy = space.p(*PIN_CENTER)
    r = space.r(PIN_RADIUS)
    tip = space.p(PIN_CENTER[0], PIN_TIP)[1]
    circle(d, (cx, cy), r, 255)
    a = math.acos(r / (tip - cy))
    d.polygon([(cx + r * math.sin(a), cy + r * math.cos(a)), (cx, tip), (cx - r * math.sin(a), cy + r * math.cos(a))], fill=255)
    return mask


def background():
    """Diagonal midnight gradient with a sunset glow at the top left."""
    small = 256
    img = Image.new("RGB", (small, small))
    px = img.load()
    for y in range(small):
        for x in range(small):
            t = (x + y) / (2 * (small - 1))
            px[x, y] = lerp(NAVY_DEEP, NAVY, t / 0.55) if t < 0.55 else lerp(NAVY, NAVY_LIGHT, (t - 0.55) / 0.45)
    img = img.resize((BIG, BIG), Image.BICUBIC).convert("RGBA")
    glow = Image.new("RGBA", (BIG, BIG), (0, 0, 0, 0))
    circle(ImageDraw.Draw(glow), (330 * SS, 260 * SS), 420 * SS, CORAL + (70,))
    return Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(250 * SS)))


def motif(space, pin_top, pin_bottom, crew_colors, route_color, shadow=True, knockout=False):
    """The pin, its crew dots, and the route. `knockout` cuts the dots out instead of filling them."""
    layer = Image.new("RGBA", (BIG, BIG), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(ROUTE_DOTS):
        circle(d, space.p(*bezier(i / ROUTE_DOTS, *ROUTE)), space.r(ROUTE_DOT_RADIUS), route_color)

    mask = pin_mask(space)
    if shadow:
        sh = Image.new("RGBA", (BIG, BIG), (0, 0, 0, 0))
        sh.putalpha(mask.point(lambda v: v * 120 // 255))
        sh = sh.transform(sh.size, Image.AFFINE, (1, 0, 0, 0, 1, -space.r(28))).filter(ImageFilter.GaussianBlur(space.r(40)))
        layer = Image.alpha_composite(layer, sh)

    top_y = space.p(0, 200)[1]
    bottom_y = space.p(0, PIN_TIP)[1]
    grad = Image.new("RGBA", (BIG, BIG))
    gd = ImageDraw.Draw(grad)
    for y in range(BIG):
        t = min(1, max(0, (y - top_y) / (bottom_y - top_y)))
        gd.line([(0, y), (BIG, y)], fill=lerp(pin_top, pin_bottom, t) + (255,))
    pin = Image.new("RGBA", (BIG, BIG), (0, 0, 0, 0))
    pin.paste(grad, (0, 0), mask)

    dots_mask = Image.new("L", (BIG, BIG), 0)
    dd = ImageDraw.Draw(dots_mask)
    for center, radius in CREW:
        circle(dd, space.p(*center), space.r(radius), 255)
    if knockout:
        pin.putalpha(Image.composite(Image.new("L", (BIG, BIG), 0), pin.getchannel("A"), dots_mask))
        return Image.alpha_composite(layer, pin)

    layer = Image.alpha_composite(layer, pin)
    d = ImageDraw.Draw(layer)
    for (center, radius), color in zip(CREW, crew_colors):
        circle(d, space.p(*center), space.r(radius), color + (255,))
    return layer


def save(img, name, mode="RGBA"):
    img.resize((SIZE, SIZE), Image.LANCZOS).convert(mode).save(ASSETS / name)


def main():
    icon_motif = dict(pin_top=WHITE, pin_bottom=BLUSH, crew_colors=[NAVY, CORAL, GOLD], route_color=WHITE + (110,))

    # iOS / default icon: full-bleed square (the system applies the mask and its own effects).
    icon = Image.alpha_composite(background(), motif(Space(), **icon_motif))
    save(icon, "icon.png", "RGB")

    # Android adaptive icon: motif shrunk into the 66% safe zone, gradient background layer, monochrome layer.
    adaptive = Space(scale=0.62)
    save(motif(adaptive, **icon_motif), "android-icon-foreground.png")
    save(background(), "android-icon-background.png", "RGB")
    save(motif(adaptive, WHITE, WHITE, [], WHITE + (150,), shadow=False, knockout=True), "android-icon-monochrome.png")

    # Splash: the mark in theme colors on transparent; app.json sets each appearance's background.
    splash = Space(scale=1.15)
    save(motif(splash, NAVY, NAVY, [WHITE, CORAL, GOLD], NAVY + (90,), shadow=False), "splash-icon.png")
    save(motif(splash, INK_LIGHT, INK_LIGHT, [NAVY, CORAL, GOLD], INK_LIGHT + (90,), shadow=False), "splash-icon-dark.png")

    icon.resize((48, 48), Image.LANCZOS).convert("RGB").save(ASSETS / "favicon.png")
    print("Wrote icon, adaptive icon layers, splash images, and favicon to", ASSETS)


if __name__ == "__main__":
    main()
