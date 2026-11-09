"""The Code Lane headline image. The board shows covers as a 64 x 36 grid of LED dots lit by brightness in one tint
per project, so the picture is a big shaded subject and a heavy wordmark: Squeektoshi in a streamer's headset on the
left, STREAM KIT on the right. Drawn with shapes at 2560 x 1440, saved at 1280 x 720, previewed through the board's
dot grid. Own drawing. Run: python tools/card.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 2560, 1440
out = Path(__file__).resolve().parent.parent / "docs"

def font(size):
    for name in ("impact.ttf", "ariblk.ttf", "arialbd.ttf"):
        try: return ImageFont.truetype(r"C:\Windows\Fonts\%s" % name, size)
        except OSError: pass
    return ImageFont.load_default()

def radial(size, inner, outer, cx=0.4, cy=0.35):
    w, h = size
    layer = Image.new("RGBA", size, outer + (255,))
    d = ImageDraw.Draw(layer)
    steps = 40
    for i in range(steps, 0, -1):
        t = i / steps
        col = tuple(int(outer[k] + (inner[k] - outer[k]) * (1 - t)) for k in range(3)) + (255,)
        bw, bh = w * t, h * t
        d.ellipse([cx * w - bw * cx, cy * h - bh * cy, cx * w + bw * (1 - cx), cy * h + bh * (1 - cy)], fill=col)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, w - 1, h - 1], fill=255)
    layer.putalpha(mask)
    return layer

FUR, FUR_DK, FUR_LT = (236, 160, 70), (120, 70, 20), (255, 214, 150)
BELLY, BELLY_DK = (255, 240, 220), (200, 170, 140)
INK, WHITE, NOSE = (14, 10, 8), (255, 255, 255), (250, 150, 150)
BAND, BAND_LT, CUP, CUP_LT, CUP_DK = (150, 150, 168), (225, 225, 238), (130, 130, 150), (205, 205, 220), (40, 40, 50)

im = Image.new("RGB", (W, H), (6, 6, 8))
glow = Image.new("RGB", (W, H), (6, 6, 8))
ImageDraw.Draw(glow).ellipse([0, 100, 1300, 1400], fill=(28, 24, 18))
im = glow.filter(ImageFilter.GaussianBlur(160))

ham = Image.new("RGBA", (W, H), (0, 0, 0, 0))
hd = ImageDraw.Draw(ham)
def shaded(box, inner, outer, cx=0.4, cy=0.35):
    x0, y0, x1, y1 = box
    ham.alpha_composite(radial((x1 - x0, y1 - y0), inner, outer, cx, cy), (x0, y0))

# ears, head, cheeks, muzzle
shaded((330, 190, 640, 500), FUR_LT, FUR_DK); shaded((900, 170, 1210, 480), FUR_LT, FUR_DK)
shaded((400, 260, 580, 440), BELLY, BELLY_DK); shaded((960, 240, 1140, 420), BELLY, BELLY_DK)
shaded((300, 330, 1250, 1320), FUR_LT, FUR_DK, 0.38, 0.3)
shaded((330, 760, 760, 1180), BELLY, BELLY_DK, 0.4, 0.3); shaded((790, 760, 1220, 1180), BELLY, BELLY_DK, 0.4, 0.3)
shaded((640, 820, 920, 1060), BELLY, BELLY_DK, 0.45, 0.3)
# eyes, nose, mouth
for (ex, ey) in ((560, 700), (990, 700)):
    hd.ellipse([ex - 95, ey - 105, ex + 95, ey + 105], fill=INK)
    hd.ellipse([ex - 45, ey - 70, ex + 15, ey - 10], fill=WHITE)
    hd.ellipse([ex + 25, ey + 20, ex + 55, ey + 50], fill=(200, 200, 210))
hd.ellipse([720, 860, 840, 950], fill=NOSE)
hd.line([780, 950, 780, 1010], fill=FUR_DK, width=14)
hd.arc([690, 960, 790, 1060], 0, 180, fill=FUR_DK, width=14)
hd.arc([770, 960, 870, 1060], 0, 180, fill=FUR_DK, width=14)
# the headset, light enough to read on the board: band, cups with a dark ring, mic boom and capsule
hd.arc([300, 150, 1250, 1500], 200, 340, fill=BAND, width=80)
hd.arc([300, 150, 1250, 1500], 215, 260, fill=BAND_LT, width=28)
for (cx, cy) in ((330, 760), (1220, 760)):
    hd.rounded_rectangle([cx - 120, cy - 200, cx + 120, cy + 200], radius=95, fill=CUP)
    hd.rounded_rectangle([cx - 80, cy - 160, cx + 80, cy + 160], radius=65, fill=CUP_DK)
    hd.rounded_rectangle([cx - 45, cy - 125, cx + 45, cy + 125], radius=45, fill=CUP_LT)
hd.line([1220, 950, 1130, 1150, 960, 1165], fill=BAND, width=46, joint="curve")
hd.ellipse([870, 1095, 1010, 1235], fill=CUP_LT)
hd.ellipse([905, 1130, 975, 1200], fill=CUP_DK)
im.paste(ham, (-70, 0), ham)

# the wordmark: two heavy lines filling the right column
d = ImageDraw.Draw(im)
AMBER, CREAM = (255, 196, 80), (248, 242, 228)
f1, f2 = font(390), font(720)
def fit_text(text, f, x0, x1):
    w = d.textlength(text, font=f)
    return x0 + (x1 - x0 - w) / 2
d.text((fit_text("STREAM", f1, 1270, 2510), 330), "STREAM", font=f1, fill=CREAM)
d.text((fit_text("KIT", f2, 1270, 2510), 650), "KIT", font=f2, fill=AMBER)

final = im.resize((1280, 720), Image.LANCZOS)
final.save(out / "card-headline.png")
small = final.resize((64, 36), Image.BOX)
for name, tint in (("orange", (255, 110, 40)), ("blue", (60, 90, 255))):
    pv = Image.new("RGB", (640, 360), (0, 0, 0))
    pd = ImageDraw.Draw(pv)
    for y in range(36):
        for x in range(64):
            r, g, b = small.getpixel((x, y))
            lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255
            v = max(0.06, lum)
            col = tuple(int(t * v) for t in tint) if lum < 0.85 else tuple(min(255, int(t * 0.5 + 128)) for t in tint)
            pd.ellipse([x * 10 + 1, y * 10 + 1, x * 10 + 9, y * 10 + 9], fill=col)
    pv.save(Path(rf"C:/Users/user/.claude/jobs/cba2ae0e/tmp/kit-card-{name}.png"))
print("wrote", out / "card-headline.png")
