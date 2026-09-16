"""Generate README terminal demo GIFs (fixture-accurate text). Run: python scripts/generate-readme-gifs.py"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "assets"

W, H = 920, 520
BG = (30, 30, 46)
FG = (205, 214, 244)
MUTED = (166, 173, 192)
GREEN = (166, 227, 161)
PURPLE = (203, 166, 247)
BLUE = (137, 180, 250)
RED = (243, 139, 168)
BAR = (108, 112, 134)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("CascadiaMono.ttf", "Consolas.ttf", "cour.ttf", "lucon.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


FONT = load_font(15)
FONT_SM = load_font(14)


def chrome(draw: ImageDraw.ImageDraw) -> None:
    for i, color in enumerate((RED, (249, 226, 175), GREEN)):
        draw.ellipse((24 + i * 20, 18, 36 + i * 20, 30), fill=color)


def frame_base() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    chrome(draw)
    return img


def draw_lines(img: Image.Image, lines: list[tuple[str, tuple[int, int, int]]], y0: int = 56) -> None:
    draw = ImageDraw.Draw(img)
    y = y0
    for text, color in lines:
        draw.text((24, y), text, fill=color, font=FONT if len(text) < 60 else FONT_SM)
        y += 22 if len(text) < 60 else 20


def save_gif(frames: list[Image.Image], path: Path, duration_ms: int = 120) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=True,
    )


def typing_frames(command: str, prefix: str = "$ ") -> list[Image.Image]:
    frames: list[Image.Image] = []
    full = prefix + command
    for n in range(1, len(full) + 1):
        img = frame_base()
        draw = ImageDraw.Draw(img)
        draw.text((24, 56), full[:n] + "▌", fill=FG, font=FONT)
        frames.append(img)
    # cursor blink hold
    for _ in range(4):
        img = frame_base()
        draw = ImageDraw.Draw(img)
        draw.text((24, 56), full, fill=FG, font=FONT)
        frames.append(img)
    return frames


def build_scan_gif() -> None:
    cmd = "npx repairo-cli scan ./fixtures/consumers --vendors stripe"
    output_blocks: list[list[tuple[str, tuple[int, int, int]]]] = [
        [("", FG)],
        [("REPAIRO", PURPLE)],
        [("REPAIRO", PURPLE), ("──────────────────────────────", BAR)],
        [
            ("REPAIRO", PURPLE),
            ("──────────────────────────────", BAR),
            ("Scanning repository: ./fixtures/consumers...", MUTED),
        ],
        [
            ("REPAIRO", PURPLE),
            ("──────────────────────────────", BAR),
            ("Scanning repository: ./fixtures/consumers...", MUTED),
            ("✓ Parsed 6 source files", GREEN),
        ],
        [
            ("REPAIRO", PURPLE),
            ("──────────────────────────────", BAR),
            ("Scanning repository: ./fixtures/consumers...", MUTED),
            ("✓ Parsed 6 source files", GREEN),
            ("✓ Found 1 API dependencies", GREEN),
            ("✓ Found 6 API call sites", GREEN),
        ],
        [
            ("REPAIRO", PURPLE),
            ("──────────────────────────────", BAR),
            ("Scanning repository: ./fixtures/consumers...", MUTED),
            ("✓ Parsed 6 source files", GREEN),
            ("✓ Found 1 API dependencies", GREEN),
            ("✓ Found 6 API call sites", GREEN),
            ("", FG),
            ("API dependencies detected:", FG),
            ("  Stripe (1 file)", BLUE),
            ("    checkout-service/src/checkout-flow.ts", MUTED),
            ("", FG),
            ("Scan completed in 0.12s", MUTED),
        ],
    ]

    frames = typing_frames(cmd)
    for block in output_blocks:
        img = frame_base()
        draw = ImageDraw.Draw(img)
        draw.text((24, 56), cmd, fill=FG, font=FONT)
        y = 56 + 28
        for text, color in block:
            if text:
                draw.text((24, y), text, fill=color, font=FONT_SM)
            y += 20
        frames.append(img)
        frames.append(img.copy())

    for _ in range(12):
        frames.append(frames[-1].copy())

    save_gif(frames, OUT / "demo-scan.gif", duration_ms=110)


def build_diff_gif() -> None:
    cmd_lines = [
        "npx repairo-cli diff --spec ./fixtures/breaking-api-demo/specs/new-openapi.json \\",
        "    --target ./fixtures/breaking-api-demo",
    ]
    frames: list[Image.Image] = []
    typed = ""
    for line in cmd_lines:
        for ch in line + "\n":
            typed += ch
            img = frame_base()
            draw = ImageDraw.Draw(img)
            y = 56
            for ln in typed.rstrip("\n").split("\n"):
                draw.text((24, y), ln + ("▌" if ln == typed.rstrip("\n").split("\n")[-1] and ch != "\n" else ""), fill=FG, font=FONT_SM)
                y += 20
            frames.append(img)

    final_cmd = typed.rstrip()
    blocks: list[list[tuple[str, tuple[int, int, int]]]] = [
        [("BREAKING", RED)],
        [
            ("BREAKING", RED),
            ("POST /v1/chat/completions — Parameter removed: max_tokens", MUTED),
        ],
        [
            ("BREAKING", RED),
            ("POST /v1/chat/completions — Parameter removed: max_tokens", MUTED),
            ("POST /v1/chat/completions — Removed request field \"max_tokens\"", MUTED),
        ],
        [
            ("BREAKING", RED),
            ("POST /v1/chat/completions — Parameter removed: max_tokens", MUTED),
            ("POST /v1/chat/completions — Removed request field \"max_tokens\"", MUTED),
            ("", FG),
            ("ADDITIVE", GREEN),
            ("POST /v1/chat/completions — Parameter added: max_output_tokens", MUTED),
        ],
        [
            ("BREAKING", RED),
            ("POST /v1/chat/completions — Parameter removed: max_tokens", MUTED),
            ("POST /v1/chat/completions — Removed request field \"max_tokens\"", MUTED),
            ("", FG),
            ("ADDITIVE", GREEN),
            ("POST /v1/chat/completions — Parameter added: max_output_tokens", MUTED),
            ("", FG),
            ("Potential impact:", FG),
            ("  1 file · 4 call sites", BLUE),
            ("", FG),
            ("Next step: repairo repair --dry-run", MUTED),
        ],
    ]

    def paint_cmd(img: Image.Image) -> None:
        draw = ImageDraw.Draw(img)
        y = 56
        for ln in final_cmd.split("\n"):
            draw.text((24, y), ln, fill=FG, font=FONT_SM)
            y += 20

    base = frames[-1].copy()
    paint_cmd(base)
    frames.append(base)

    for block in blocks:
        img = base.copy()
        y = 56 + 20 * len(final_cmd.split("\n")) + 8
        draw = ImageDraw.Draw(img)
        paint_cmd(img)
        for text, color in block:
            draw.text((24, y), text, fill=color, font=FONT_SM)
            y += 20
        frames.append(img)
        frames.append(img.copy())

    for _ in range(14):
        frames.append(frames[-1].copy())

    save_gif(frames, OUT / "demo-diff.gif", duration_ms=130)


def main() -> None:
    build_scan_gif()
    build_diff_gif()
    for name in ("demo-scan.gif", "demo-diff.gif"):
        p = OUT / name
        print(f"Wrote {p} ({p.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
