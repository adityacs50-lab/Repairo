import os
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
PROJECT_ROOT = OUT.parent

def generate_yc_icon(size: int = 512) -> Image.Image:
    # High-res RGBA canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    s = size / 512.0  # scale multiplier
    
    # 1. Draw solid dark circular badge (Linear/Vercel standard)
    center = size / 2
    radius = 236 * s
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=(11, 11, 11, 255)
    )
    
    # 2. Draw code-bracket mark (centered inside circle)
    # Define points scaled to size
    left_bracket = [
        (230 * s, 155 * s),
        (150 * s, 256 * s),
        (230 * s, 357 * s)
    ]
    right_bracket = [
        (282 * s, 155 * s),
        (362 * s, 256 * s),
        (282 * s, 357 * s)
    ]
    slash = [
        (195 * s, 385 * s),
        (317 * s, 127 * s)
    ]
    
    # Thickness
    bracket_w = int(32 * s)
    slash_w = int(28 * s)
    
    # Draw Left Bracket < (White)
    draw.line(left_bracket, fill=(255, 255, 255, 255), width=bracket_w, joint="round")
    
    # Draw Right Bracket > (White)
    draw.line(right_bracket, fill=(255, 255, 255, 255), width=bracket_w, joint="round")
    
    # Draw Healing Slash / (Vibrant green: #10B981)
    draw.line(slash, fill=(16, 185, 129, 255), width=slash_w, joint="round")
    
    # Draw rounded ends for the slash using circles (ensures perfect caps on any PIL version)
    cap_r = slash_w // 2
    for p in slash:
        draw.ellipse([p[0] - cap_r, p[1] - cap_r, p[0] + cap_r, p[1] + cap_r], fill=(16, 185, 129, 255))
        
    return img

def main():
    print("Generating Repairo brand icon assets...")
    
    # Generate 512x512 master icon
    icon_512 = generate_yc_icon(512)
    
    # Save to brand folder
    icon_512.save(OUT / "icon-512.png", "PNG", optimize=True)
    
    # Save to Next.js app folder for automatic favicon metadata (icon.png)
    app_icon_path = PROJECT_ROOT / "src" / "app" / "icon.png"
    icon_512.save(app_icon_path, "PNG", optimize=True)
    print(f"  Saved icon.png to {app_icon_path.relative_to(PROJECT_ROOT)}")
    
    # Generate 32x32 standard favicon
    icon_32 = generate_yc_icon(32)
    favicon_path = PROJECT_ROOT / "public" / "favicon.ico"
    # ICO format fallback
    icon_32.save(favicon_path, "ICO")
    print(f"  Saved favicon.ico to {favicon_path.relative_to(PROJECT_ROOT)}")
    
    print("Successfully generated all brand icon assets!")

if __name__ == "__main__":
    main()
