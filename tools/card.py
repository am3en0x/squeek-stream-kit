"""The Code Lane headline image, drawn on the board's 64 x 36 LED grid and exported at 20 px per dot (1280 x 720):
a stream screen with LIVE in the corner and Squeektoshi running in his wheel on it, a chat bubble beside it with the
three Round Call bars, and a big exclamation mark: the chat calls, the wheel settles. Own drawing. Run: python tools/card.py"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

W, H = 64, 36
BG, PLATE, RIM, DIM = (11, 10, 14), (24, 24, 31), (160, 153, 168), (70, 68, 82)
AMBER, CREAM = (246, 166, 59), (243, 233, 204)
FUR, FUR_DK, BELLY, INK, NOSE = (255, 196, 92), (214, 140, 30), (255, 240, 210), (20, 12, 2), (255, 150, 130)

px = {}
def put(x, y, c):
    if 0 <= x < W and 0 <= y < H: px[(x, y)] = c
def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): put(x, y, c)
def frame(x0, y0, x1, y1, c, round_=True):
    for x in range(x0, x1 + 1): put(x, y0, c); put(x, y1, c)
    for y in range(y0, y1 + 1): put(x0, y, c); put(x1, y, c)
    if round_:
        for (x, y) in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)): px.pop((x, y), None)
def disc(cx, cy, r, c, r_in=-1):
    for y in range(H):
        for x in range(W):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if r_in * r_in < d2 <= r * r + r: put(x, y, c)
def ring(cx, cy, r, c, n=None):
    n = n or int(r * 8)
    for k in range(n):
        a = 2 * math.pi * k / n
        put(round(cx + r * math.cos(a)), round(cy + r * math.sin(a)), c)
def line(x0, y0, x1, y1, c):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for i in range(n + 1): put(round(x0 + (x1 - x0) * i / n), round(y0 + (y1 - y0) * i / n), c)
TINY = {'L': ['100', '100', '100', '100', '111'], 'I': ['111', '010', '010', '010', '111'], 'V': ['101', '101', '101', '101', '010'], 'E': ['111', '100', '111', '100', '111']}
def tiny(s, x, y, c):
    for ch in s:
        for j, row in enumerate(TINY[ch]):
            for i, b in enumerate(row):
                if b == '1': put(x + i, y + j, c)
        x += 4

# the screen: a rounded frame on a stand, a darker plate inside
rect(2, 3, 40, 31, PLATE)
frame(1, 2, 41, 32, RIM)
rect(17, 33, 25, 33, RIM); rect(14, 34, 28, 34, RIM)
# LIVE in the corner
put(4, 5, CREAM); put(5, 5, CREAM); put(4, 6, CREAM); put(5, 6, CREAM)
tiny('LIVE', 8, 4, CREAM)

# the wheel on screen: dim rim, bright rungs, three thin spokes, the axle
CX, CY, R = 21, 20, 9
ring(CX, CY, R, DIM)
ring(CX, CY, R, CREAM, 12)
for deg in (30, 150, 270):
    a = math.radians(deg)
    for d in range(2, R - 1, 2): put(round(CX + d * math.cos(a)), round(CY + d * math.sin(a)), DIM)
put(CX, CY, AMBER)
# Squeektoshi running at the bottom of the drum, facing right
rect(16, 23, 24, 26, FUR); disc(17, 25, 1, FUR); rect(17, 26, 23, 27, BELLY)
disc(25, 23, 2, FUR); put(25, 20, FUR); put(26, 21, FUR)
put(26, 22, INK); put(27, 24, NOSE)
line(15, 24, 13, 22, FUR_DK)
for x in (17, 19, 22, 24): put(x, 28, FUR_DK)

# the chat bubble with the three Round Call bars, its tail pointing at the screen
frame(44, 4, 62, 19, CREAM)
line(46, 19, 43, 22, CREAM); put(47, 19, CREAM); put(44, 21, CREAM)
rect(47, 14, 49, 17, CREAM)     # nap
rect(52, 8, 54, 17, AMBER)      # jog, leading
rect(57, 11, 59, 17, CREAM)     # zoomies
# the call: a big exclamation mark
rect(51, 22, 54, 29, AMBER)
rect(51, 31, 54, 33, AMBER)

out = Path(__file__).resolve().parent.parent / "docs"
scale = 20
im = Image.new("RGB", (W * scale, H * scale), BG)
d = ImageDraw.Draw(im)
for (x, y), c in px.items():
    d.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=c)
im.save(out / "card-headline.png")
# previews in the board's two tints
for name, tint in (("blue", (60, 90, 255)), ("orange", (255, 110, 40))):
    pv = Image.new("RGB", (W * 10, H * 10), (0, 0, 0))
    pd = ImageDraw.Draw(pv)
    for y in range(H):
        for x in range(W):
            c = px.get((x, y), BG)
            lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255
            v = max(0.08, lum)
            col = tuple(int(t * v) for t in tint) if lum < 0.9 else tuple(min(255, int(t * 0.55 + 120)) for t in tint)
            pd.ellipse([x * 10 + 1, y * 10 + 1, x * 10 + 9, y * 10 + 9], fill=col)
    pv.save(Path(rf"C:/Users/user/.claude/jobs/cba2ae0e/tmp/kit-card-{name}.png"))
print("wrote", out / "card-headline.png")
