"""The Code Lane headline image, drawn on the board's 64 x 36 LED grid and exported at 20 px per dot (1280 x 720):
a stream scene with the kit's pieces on it: the LED board with the wheel, a cam frame with its running rim, an alert
card with the zoomies bolt and the ticker along the bottom. Own drawing. Run: python tools/card.py"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

W, H = 64, 36
BG, PLATE, RIM, DIM = (11, 10, 14), (22, 22, 28), (150, 143, 158), (52, 52, 62)
AMBER, CREAM, LABEL = (246, 166, 59), (243, 233, 204), (120, 112, 128)

px = {}
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[(x, y)] = c
def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, c)
def frame(x0, y0, x1, y1, c, step=1):
    for x in range(x0, x1 + 1, step): put(x, y0, c); put(x, y1, c)
    for y in range(y0, y1 + 1, step): put(x0, y, c); put(x1, y, c)
def ring(cx, cy, r, c):
    for k in range(int(r * 8)):
        a = 2 * math.pi * k / int(r * 8)
        put(round(cx + r * math.cos(a)), round(cy + r * math.sin(a)), c)
def spoke(cx, cy, r, deg, c):
    a = math.radians(deg)
    for d in range(2, int(r)): put(round(cx + d * math.cos(a)), round(cy + d * math.sin(a)), c)

# the LED board, top left: a plate with text lines and the wheel
rect(2, 2, 31, 21, PLATE)
rect(4, 4, 16, 5, AMBER)            # SQUEEKTOSHI
rect(4, 7, 13, 8, CREAM)            # IS RUNNING
rect(4, 11, 7, 12, LABEL)           # TODAY
rect(4, 13, 12, 16, CREAM)          # 3.42
rect(13, 15, 15, 16, LABEL)         # KM
rect(4, 18, 20, 19, DIM); rect(4, 18, 11, 19, AMBER)   # block bar
ring(25, 11, 5, RIM)
for d in (20, 140, 260): spoke(25, 11, 5, d, CREAM)
put(25, 11, AMBER)

# the cam frame, top right: a dotted rim with the bright runner on it
frame(35, 2, 61, 21, DIM, 2)
for i, (x, y) in enumerate(((39, 2), (41, 2), (43, 2), (45, 2), (47, 2), (49, 2), (51, 2))):
    put(x, y, CREAM if i >= 5 else AMBER)
rect(37, 16, 55, 19, PLATE)
rect(38, 17, 44, 18, AMBER); rect(45, 17, 53, 18, CREAM)   # name plate text

# the alert card, bottom middle: the zoomies bolt and the words
rect(14, 24, 49, 31, PLATE)
frame(14, 24, 49, 31, DIM)
for (x, y) in ((19, 25), (18, 26), (17, 27), (18, 27), (19, 27), (18, 28), (17, 29), (16, 30)): put(x, y, CREAM)
rect(22, 25, 38, 27, AMBER)         # ZOOMIES!
rect(26, 29, 36, 30, CREAM)         # 5.0 KM/H

# the ticker along the bottom
rect(0, 33, 63, 33, AMBER)
rect(0, 34, 63, 35, PLATE)
rect(1, 34, 8, 35, CREAM)
for x0 in (11, 23, 37, 50): rect(x0, 34, x0 + 7, 35, LABEL)
for x0 in (19, 32, 46, 58): rect(x0, 34, x0 + 2, 35, AMBER)

out = Path(__file__).resolve().parent.parent / "docs"
scale = 20
im = Image.new("RGB", (W * scale, H * scale), BG)
d = ImageDraw.Draw(im)
for (x, y), c in px.items():
    d.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=c)
im.save(out / "card-headline.png")
pv = Image.new("RGB", (W * 10, H * 10), (0, 0, 0))
pd = ImageDraw.Draw(pv)
for y in range(H):
    for x in range(W):
        c = px.get((x, y), BG)
        lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255
        v = max(0.08, lum)
        col = (int(60 * v), int(90 * v), int(255 * v)) if lum < 0.9 else (int(200 * v), int(215 * v), 255)
        pd.ellipse([x * 10 + 1, y * 10 + 1, x * 10 + 9, y * 10 + 9], fill=col)
pv.save(Path(r"C:/Users/user/.claude/jobs/cba2ae0e/tmp/kit-card-led.png"))
print("wrote", out / "card-headline.png")
