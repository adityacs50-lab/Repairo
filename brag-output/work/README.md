# Rebuilding brag.mp4

Source for the Repairo launch film (made with the /brag-slim skill).

- `film.html` — every frame is `render(t)`, a pure function of time (1920×1080).
- `score.py` — original score + SFX (numpy only), writes `score.wav`.
- `render.mjs` — drives Chromium via `playwright-core` and pipes PNG frames into ffmpeg.

```bash
npm i --no-save playwright-core ffmpeg-static   # or use a system ffmpeg
python3 score.py
CHROMIUM=/path/to/chrome FFMPEG=$(node -p "require('ffmpeg-static')") node render.mjs video
node render.mjs stills 23.9 && cp stills/t23.90.png poster.png
ffmpeg -i video-only.mp4 -loop 1 -i poster.png -i score.wav \
  -filter_complex "[1:v]format=yuv420p[p];[0:v][p]overlay=0:0:enable='eq(n,0)':shortest=1[v]" \
  -map "[v]" -map 2:a -c:v libx264 -crf 16 -pix_fmt yuv420p -r 30 -c:a aac -b:a 256k \
  -movflags +faststart -t 25 ../brag.mp4
```
