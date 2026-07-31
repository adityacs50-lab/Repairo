"""Generate Repairo LinkedIn assets in Dusker-style: geometric R + spaced banner."""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent
FONT_BOLD = OUT / "Geist-SemiBold.ttf"
FONT_MED = OUT / "Geist-Medium.ttf"

BG = (8, 8, 8)  # near-black
WHITE = (255, 255, 255)
MUTED = (180, 180, 180)

BANNER_W, BANNER_H = 4200, 700
# Dusker-style banner copy
BANNER_TITLE = "REPAIRO"
BANNER_TAG = "SELF-MAINTAINING APIS"


def _font(size: int, medium: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_MED if medium and FONT_MED.exists() else FONT_BOLD
    return ImageFont.truetype(str(path), size)


def _space_letters(text: str, letter_gap: str = "  ", word_gap: str = "     ") -> str:
    """Wide tracking like Dusker; keep larger gaps between words."""
    parts = []
    for word in text.split(" "):
        parts.append(letter_gap.join(list(word)))
    return word_gap.join(parts)


def make_noise_texture(w: int, h: int, strength: int = 18) -> Image.Image:
    """Subtle grain on dark field (Dusker banner feel)."""
    rng = random.Random(42)
    img = Image.new("RGB", (w, h), BG)
    px = img.load()
    for y in range(h):
        for x in range(w):
            n = rng.randint(-strength, strength)
            v = max(0, min(255, BG[0] + n))
            px[x, y] = (v, v, v)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.ellipse(
        [-w // 5, -h, w + w // 5, h * 2],
        fill=(255, 255, 255, 10),
    )
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(8, h // 3)))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def draw_geometric_r(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], bg: tuple[int, int, int] = BG) -> None:
    """Clean geometric R: triangle-tessellated stem + solid bowl + leg."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    stroke = max(5, w // 11)

    # --- Stem: vertical stack of right-pointing triangles ---
    stem_w = int(w * 0.26)
    rows = 16
    tri_h = h / rows
    for i in range(rows):
        top = y0 + i * tri_h
        bot = y0 + (i + 1) * tri_h
        mid_y = (top + bot) / 2
        # slight overlap so no hairline gaps
        pts = [
            (x0, top - 0.5),
            (x0 + stem_w, mid_y),
            (x0, bot + 0.5),
        ]
        draw.polygon([(round(p[0]), round(p[1])) for p in pts], fill=WHITE)

    # --- Bowl (upper loop of R) as thick arc ---
    # Bounding box for the bowl ellipse
    bx0 = x0 + int(stem_w * 0.35)
    by0 = y0
    bx1 = x1
    by1 = y0 + int(h * 0.58)
    # Draw thick ring by outer ellipse minus inner
    draw.ellipse([bx0, by0, bx1, by1], outline=WHITE, width=stroke)
    # Mask left side so bowl opens into the stem (D-like opening)
    mask_right = x0 + stem_w - stroke // 3
    draw.rectangle([bx0 - 2, by0 - 2, mask_right, by1 + 2], fill=bg)
    # Redraw stem over mask
    for i in range(rows):
        top = y0 + i * tri_h
        bot = y0 + (i + 1) * tri_h
        mid_y = (top + bot) / 2
        pts = [(x0, top - 0.5), (x0 + stem_w, mid_y), (x0, bot + 0.5)]
        draw.polygon([(round(p[0]), round(p[1])) for p in pts], fill=WHITE)

    # Connect stem to bowl at top and mid with short bars
    draw.rectangle(
        [x0 + stem_w - 2, y0, x0 + int(w * 0.42), y0 + stroke],
        fill=WHITE,
    )
    mid_y = y0 + int(h * 0.52)
    draw.rectangle(
        [x0 + stem_w - 2, mid_y - stroke // 2, x0 + int(w * 0.48), mid_y + stroke // 2],
        fill=WHITE,
    )

    # --- Leg ---
    leg_top = (x0 + int(stem_w * 0.55), mid_y)
    leg_bot = (x1 - int(w * 0.04), y1)
    dx = leg_bot[0] - leg_top[0]
    dy = leg_bot[1] - leg_top[1]
    length = math.hypot(dx, dy) or 1
    ox = -dy / length * (stroke / 2)
    oy = dx / length * (stroke / 2)
    leg = [
        (leg_top[0] + ox, leg_top[1] + oy),
        (leg_top[0] - ox, leg_top[1] - oy),
        (leg_bot[0] - ox, leg_bot[1] - oy),
        (leg_bot[0] + ox, leg_bot[1] + oy),
    ]
    draw.polygon([(round(p[0]), round(p[1])) for p in leg], fill=WHITE)


def make_logo(size: int = 1024) -> Image.Image:
    """Square black logo with geometric R — LinkedIn page avatar."""
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    pad = int(size * 0.18)
    draw_geometric_r(draw, (pad, pad, size - pad, size - pad), bg=BG)
    return img


def make_banner(w: int = BANNER_W, h: int = BANNER_H) -> Image.Image:
    """Dusker-style cover: spaced caps title + spaced tagline on dark grain."""
    grain = make_noise_texture(w // 4, h // 4, strength=22)
    img = grain.resize((w, h), Image.Resampling.BILINEAR)

    title = _space_letters(BANNER_TITLE, letter_gap="   ")
    tag = _space_letters(BANNER_TAG, letter_gap="  ", word_gap="      ")

    title_font = _font(int(h * 0.22))
    tag_font = _font(int(h * 0.055), medium=True)

    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    tb = probe.textbbox((0, 0), title, font=title_font)
    gb = probe.textbbox((0, 0), tag, font=tag_font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    gw, gh = gb[2] - gb[0], gb[3] - gb[1]
    gap = int(h * 0.08)
    stack = th + gap + gh
    top = (h - stack) // 2

    draw = ImageDraw.Draw(img)
    cx = w // 2
    draw.text(
        (cx - tw // 2 - tb[0], top - tb[1]),
        title,
        font=title_font,
        fill=WHITE,
    )
    draw.text(
        (cx - gw // 2 - gb[0], top + th + gap - gb[1]),
        tag,
        font=tag_font,
        fill=MUTED,
    )
    return img


def write_svgs() -> None:
    (OUT / "logo-mark.svg").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" fill="#080808"/>
  <!-- Geometric R: triangle stem + bowl + leg -->
  <g fill="#ffffff">
    <!-- stem triangles -->
    <polygon points="72,72 128,90 72,108"/>
    <polygon points="128,108 72,126 128,144"/>
    <polygon points="72,144 128,162 72,180"/>
    <polygon points="128,180 72,198 128,216"/>
    <polygon points="72,216 128,234 72,252"/>
    <polygon points="128,252 72,270 128,288"/>
    <polygon points="72,288 128,306 72,324"/>
    <polygon points="128,324 72,328 128,328 128,324"/>
  </g>
  <path d="M120 78 H210 A95 95 0 0 1 210 268 H120"
        fill="none" stroke="#ffffff" stroke-width="28"/>
  <rect x="72" y="250" width="90" height="26" fill="#ffffff"/>
  <polygon points="150,255 328,328 300,328 130,268" fill="#ffffff"/>
</svg>
""",
        encoding="utf-8",
    )

    title = _space_letters(BANNER_TITLE, letter_gap="   ")
    tag = _space_letters(BANNER_TAG, letter_gap="  ", word_gap="      ")
    (OUT / "banner.svg").write_text(
        f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4200 700" width="4200" height="700">
  <rect width="4200" height="700" fill="#080808"/>
  <text x="2100" y="320" text-anchor="middle"
        font-family="Geist, Inter, Segoe UI, Arial, sans-serif"
        font-size="150" font-weight="600" fill="#ffffff"
        letter-spacing="24">{title}</text>
  <text x="2100" y="420" text-anchor="middle"
        font-family="Geist, Inter, Segoe UI, Arial, sans-serif"
        font-size="38" font-weight="500" fill="#b4b4b4"
        letter-spacing="10">{tag}</text>
</svg>
""",
        encoding="utf-8",
    )


def main() -> None:
    logo = make_logo(1024)
    logo.save(OUT / "logo-1024.png", "PNG", optimize=True)
    logo.resize((400, 400), Image.Resampling.LANCZOS).save(
        OUT / "logo-400.png", "PNG", optimize=True
    )
    logo.resize((2048, 2048), Image.Resampling.LANCZOS).save(
        OUT / "logo-2048.png", "PNG", optimize=True
    )

    banner = make_banner()
    assert banner.size == (4200, 700)
    banner.save(OUT / "banner-4200x700.png", "PNG", optimize=True)
    banner.save(OUT / "banner-4200x700.jpg", "JPEG", quality=92, optimize=True)
    banner.resize((1128, 191), Image.Resampling.LANCZOS).save(
        OUT / "banner-linkedin-display-1128x191.png", "PNG", optimize=True
    )
    banner.resize((1260, 210), Image.Resampling.LANCZOS).save(
        OUT / "banner-preview.png", "PNG", optimize=True
    )

    write_svgs()

    # Keep a simple wordmark horizontal for site use (light)
    # Optional: skip regenerating old wordmarks — leave existing files

    print("Dusker-style assets:")
    for p in sorted(OUT.iterdir()):
        if p.suffix.lower() in {".png", ".jpg", ".svg"}:
            print(f"  {p.name:40} {p.stat().st_size / 1024:7.1f} KB")


if __name__ == "__main__":
    main()
