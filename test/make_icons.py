"""Draw the web app icons from the Android icon's design (ic_target.xml): python make_icons.py

A target whose outer ring holds the three rating colours, on slate. Drawn at 4x and scaled down for smooth edges.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
SLATE = (0x2F, 0x45, 0x50, 255)
ARCS = [((0x3F, 0xB5, 0x61), -80, 20), ((0xF5, 0xA5, 0x24), 40, 140), ((0xE5, 0x48, 0x4D), 160, 260)]


def draw(size, scale):
    """scale = how big the motif is: 1.0 = the Android safe zone, larger fills more of the square."""
    big = size * 4
    im = Image.new("RGBA", (big, big), SLATE)
    d = ImageDraw.Draw(im)
    u = big / 108 * scale  # one unit of the 108-unit adaptive icon canvas
    c = big / 2
    r, w = 24 * u, 5.5 * u
    for rgb, a0, a1 in ARCS:
        box = [c - r, c - r, c + r, c + r]
        d.arc(box, a0, a1, fill=rgb, width=round(w))
        for a in (a0, a1):  # round caps
            x, y = c + (r - w / 2) * math.cos(math.radians(a)), c + (r - w / 2) * math.sin(math.radians(a))
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=rgb)
    rr, rw = 13 * u, 3.4 * u
    d.ellipse([c - rr - rw / 2, c - rr - rw / 2, c + rr + rw / 2, c + rr + rw / 2], outline="white", width=round(rw))
    dot = 4.8 * u
    d.ellipse([c - dot, c - dot, c + dot, c + dot], fill="white")
    return im.resize((size, size), Image.LANCZOS).convert("RGB")


OUT.mkdir(exist_ok=True)
draw(512, 1.45).save(OUT / "icon-512.png")
draw(192, 1.45).save(OUT / "icon-192.png")
draw(180, 1.45).save(OUT / "apple-touch-icon.png")  # iOS rounds the corners itself
draw(512, 1.15).save(OUT / "maskable-512.png")  # Android crops maskable icons to a circle
print("icons:", sorted(p.name for p in OUT.iterdir()))
