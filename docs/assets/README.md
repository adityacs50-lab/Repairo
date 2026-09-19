# README demo assets

| File | What it shows |
| --- | --- |
| `repairo-demo.mp4` | The 47s product film, with narration — break → AST impact → patch → compile gate → PR |
| `repairo-demo.gif` | Silent 9.6s opening of that film, used as the autoplaying README thumbnail |
| `demo-scan.gif` | `npx repairo-cli scan ./fixtures/consumers --vendors stripe` |
| `demo-diff.gif` | OpenAPI diff + impact on `fixtures/breaking-api-demo` |
| `demo-*.tape` | Optional [VHS](https://github.com/charmbracelet/vhs) tapes (Linux/macOS) |
| `terminal-*.svg` | Static fallbacks (same text as the GIFs) |

The inset screens inside the film are real recordings of the app at `/demo`, not
mockups. The GIF is the thumbnail because GitHub will not inline-play an `.mp4`
served from the repo — clicking it opens the blob page, which does have a player.

## Regenerate the film thumbnail

```bash
ffmpeg -y -ss 0.2 -t 9.6 -i docs/assets/repairo-demo.mp4 \
  -vf "fps=12,scale=720:-1:flags=lanczos,palettegen=stats_mode=diff" /tmp/pal.png
ffmpeg -y -ss 0.2 -t 9.6 -i docs/assets/repairo-demo.mp4 -i /tmp/pal.png \
  -lavfi "fps=12,scale=720:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -loop 0 docs/assets/repairo-demo.gif
```

## Regenerate GIFs

From repo root (Python 3 + Pillow):

```bash
pip install pillow
python scripts/generate-readme-gifs.py
```

Or on Linux/macOS with VHS installed:

```bash
vhs docs/assets/demo-scan.tape
vhs docs/assets/demo-diff.tape
```
