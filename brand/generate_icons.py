import os
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
PROJECT_ROOT = OUT.parent

def generate_yc_cube_icon(size: int = 512) -> Image.Image:
    # High-res RGBA canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    s = size / 512.0  # scale multiplier
    
    # 1. Background dark circular badge (Linear/Vercel standard)
    center = size / 2
    radius = 236 * s
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=(11, 11, 11, 255)
    )
    
    # 2. Draw 3D Isometric Opened Vault (Monochromatic)
    # Colors:
    # Left face (White/Light gray): (244, 244, 255, 255)
    # Right face (Muted gray): (161, 161, 170, 255)
    # Inner Core (Monochromatic dark-gray: zinc-500): (113, 113, 122, 255)
    
    # Coordinates mapping (scaled by s):
    # Box Bottom Center
    b_bot = (256 * s, 395 * s)
    # Box Left Bottom
    b_l_bot = (136 * s, 325 * s)
    # Box Right Bottom
    b_r_bot = (376 * s, 325 * s)
    # Box Front Top Center
    b_f_top = (256 * s, 305 * s)
    # Box Left Top
    b_l_top = (136 * s, 235 * s)
    # Box Right Top
    b_r_top = (376 * s, 235 * s)
    # Box Back Top Center
    b_b_top = (256 * s, 165 * s)
    
    # Draw Left Face (Light gray)
    draw.polygon([b_l_top, b_f_top, b_bot, b_l_bot], fill=(244, 244, 245, 255))
    
    # Draw Right Face (Muted gray)
    draw.polygon([b_f_top, b_r_top, b_r_bot, b_bot], fill=(161, 161, 170, 255))
    
    # Draw Inner Core (Monochromatic dark-gray: zinc-500)
    draw.polygon([b_l_top, b_b_top, b_r_top, b_f_top], fill=(113, 113, 122, 255))
    
    # Floating Lid (raised vertically by 115px)
    offset_y = 115 * s
    l_f_top = (256 * s, (305 - 115) * s)
    l_l_top = (136 * s, (235 - 115) * s)
    l_r_top = (376 * s, (235 - 115) * s)
    l_b_top = (256 * s, (165 - 115) * s)
    
    # Lid thickness bottom points
    thick = 16 * s
    l_f_bot = (256 * s, (305 - 115 + 16) * s)
    l_l_bot = (136 * s, (235 - 115 + 16) * s)
    l_r_bot = (376 * s, (235 - 115 + 16) * s)
    
    # Draw Lid Left thickness edge
    draw.polygon([l_l_top, l_f_top, l_f_bot, l_l_bot], fill=(244, 244, 245, 255))
    
    # Draw Lid Right thickness edge
    draw.polygon([l_f_top, l_r_top, l_r_bot, l_f_bot], fill=(161, 161, 170, 255))
    
    # Draw Lid Top Face (Pure White)
    draw.polygon([l_l_top, l_b_top, l_r_top, l_f_top], fill=(255, 255, 255, 255))
    
    return img

def main():
    print("Generating Repairo 3D Isometric Vault icon assets (Monochromatic)...")
    
    # Generate 512x512 master icon
    icon_512 = generate_yc_cube_icon(512)
    
    # Save to brand folder
    icon_512.save(OUT / "icon-512.png", "PNG", optimize=True)
    
    # Save to Next.js app folder for automatic favicon metadata (icon.png)
    app_icon_path = PROJECT_ROOT / "src" / "app" / "icon.png"
    icon_512.save(app_icon_path, "PNG", optimize=True)
    print(f"  Saved icon.png to {app_icon_path.relative_to(PROJECT_ROOT)}")
    
    # Generate 32x32 standard favicon
    icon_32 = generate_yc_cube_icon(32)
    favicon_path = PROJECT_ROOT / "public" / "favicon.ico"
    icon_32.save(favicon_path, "ICO")
    print(f"  Saved favicon.ico to {favicon_path.relative_to(PROJECT_ROOT)}")
    
    print("Successfully generated all brand icon assets!")

if __name__ == "__main__":
    main()
