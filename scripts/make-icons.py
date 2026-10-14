"""
Draws TripHub's app icon, Android adaptive-icon layers, splash images, and favicon
from one geometry: a dotted route curving up to three overlapping dots (the group
arriving together). See docs/design-system.md, section 5.

Run from the project root:  python scripts/make-icons.py
Needs Pillow (pip install pillow). Writes into assets/.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SIZE = 1024
SS = 4  # supersampling factor for smooth edges

TEAL_TOP = (14, 124, 116)  # #0E7C74
TEAL_BOTTOM = (18, 150, 140)  # #12968C

# Motif geometry on a 1024 canvas.
ROUTE = [(230, 800), (290, 430), (640, 470)]  # quadratic Bezier: start, control, end
ROUTE_DOT_RADIUS = 26
ROUTE_DOT_COUNT = 7
CREW = [  # (center x, center y, radius)
    (640, 340, 118),
    (775, 365, 118),
    (705, 470, 118),
]


def bezier(t, p0, p1, p2):
    u = 1 - t
    return (
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    )


def motif_bounds():
    xs = [ROUTE[0][0] - ROUTE_DOT_RADIUS] + [x + r for x, _, r in CREW] + [x - r for x, _, r in CREW]
    ys = [ROUTE[0][1] + ROUTE_DOT_RADIUS] + [y - r for _, y, r in CREW] + [y + r for _, y, r in CREW]
    return min(xs), min(ys), max(xs), max(ys)


def draw_motif(scale, route_color, crew_colors, canvas=SIZE, background=None):
    """The motif fitted to `scale` of the canvas width and centered. Colors are RGBA tuples."""
    big = canvas * SS
    img = Image.new("RGBA", (big, big), background or (0, 0, 0, 0))
    left, top, right, bottom = motif_bounds()
    k = (canvas * scale) / (right - left) * SS
    ox = big / 2 - (left + right) / 2 * k
    oy = big / 2 - (top + bottom) / 2 * k

    def tx(x, y):
        return ox + x * k, oy + y * k

    draw = ImageDraw.Draw(img)
    # Route dots, stopping short of the crew so the path leads into it.
    for i in range(ROUTE_DOT_COUNT):
        t = i / (ROUTE_DOT_COUNT - 1) * 0.86
        x, y = tx(*bezier(t, *ROUTE))
        r = ROUTE_DOT_RADIUS * k
        draw.ellipse((x - r, y - r, x + r, y + r), fill=route_color)

    # Overlapping crew circles, each on its own layer so translucency shows the overlap.
    for (cx, cy, cr), color in zip(CREW, crew_colors):
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        x, y = tx(cx, cy)
        r = cr * k
        ImageDraw.Draw(layer).ellipse((x - r, y - r, x + r, y + r), fill=color)
        img = Image.alpha_composite(img, layer)
    return img.resize((canvas, canvas), Image.LANCZOS)


def gradient(canvas=SIZE):
    img = Image.new("RGBA", (canvas, canvas))
    draw = ImageDraw.Draw(img)
    for y in range(canvas):
        t = y / (canvas - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(TEAL_TOP, TEAL_BOTTOM))
        draw.line([(0, y), (canvas, y)], fill=color + (255,))
    return img


WHITE = (255, 255, 255, 255)
ICON_CREW = [(255, 255, 255, 245), (255, 210, 122, 235), (191, 237, 230, 235)]


def main():
    # iOS / default icon: full-bleed square (the system applies the mask and effects).
    icon = Image.alpha_composite(gradient(), draw_motif(0.68, WHITE, ICON_CREW))
    icon.convert("RGB").save(ASSETS / "icon.png")

    # Android adaptive icon: foreground kept inside the 66% safe zone, solid background, monochrome layer.
    draw_motif(0.5, WHITE, ICON_CREW).save(ASSETS / "android-icon-foreground.png")
    Image.new("RGBA", (SIZE, SIZE), TEAL_TOP + (255,)).save(ASSETS / "android-icon-background.png")
    draw_motif(0.5, WHITE, [WHITE, (255, 255, 255, 200), (255, 255, 255, 160)]).save(
        ASSETS / "android-icon-monochrome.png"
    )

    # Splash images: the motif in theme colors on transparent; app.json sets the background per appearance.
    draw_motif(0.9, (14, 124, 116, 255), [(14, 124, 116, 245), (242, 184, 75, 235), (127, 214, 203, 235)]).save(
        ASSETS / "splash-icon.png"
    )
    draw_motif(0.9, (79, 209, 193, 255), [(79, 209, 193, 245), (224, 166, 58, 235), (44, 143, 132, 235)]).save(
        ASSETS / "splash-icon-dark.png"
    )

    icon.resize((48, 48), Image.LANCZOS).convert("RGB").save(ASSETS / "favicon.png")
    print("Wrote icon, adaptive icon layers, splash images, and favicon to", ASSETS)


if __name__ == "__main__":
    main()
