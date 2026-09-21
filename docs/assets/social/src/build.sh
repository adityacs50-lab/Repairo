#!/usr/bin/env bash
# Repairo social film — full build. Run from this directory.
#   npm i ffmpeg-static playwright-core && pip install numpy
#   PW_CHROME=/path/to/chrome bash build.sh
#
# Renders the 9:16 and 1:1 cuts from scene.html, builds the audio mix, and
# writes the deliverables into the parent directory. ~45 min on 4 cores.
set -euo pipefail
FF=$(node -e "console.log(require('ffmpeg-static'))")
MUSIC=${MUSIC:-../../../../public/music/bg-music.mp3}   # repo's public/music/bg-music.mp3
OUT=${OUT:-..}
mkdir -p "$OUT"

echo "==> fonts"
python3 fetch-fonts.py

echo "==> sound design"
python3 sfx.py

echo "==> audio mix (music + sfx, sidechained, -14 LUFS)"
"$FF" -hide_banner -loglevel warning -y \
  -ss 13.0 -t 35.5 -i "$MUSIC" -i sfx.wav \
  -filter_complex "\
[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,\
highpass=f=46,equalizer=f=300:t=q:w=1.1:g=-2.4,equalizer=f=3400:t=q:w=1.2:g=1.4,\
afade=t=in:st=0:d=1.4,afade=t=out:st=34.2:d=1.3,volume=0.92[mus];\
[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,atrim=0:35.5[sx];\
[sx]asplit=2[sfxa][sc];\
[mus][sc]sidechaincompress=threshold=0.045:ratio=4:attack=4:release=280:makeup=1[musd];\
[musd][sfxa]amix=inputs=2:weights='1 1.2':normalize=0,alimiter=limit=0.96,\
loudnorm=I=-14:TP=-1.0:LRA=11[out]" \
  -map "[out]" -ac 2 -ar 48000 -c:a pcm_s16le mix.wav

for AR in 9x16 1x1; do
  echo "==> render $AR (3x sub-frame shutter blur, ~15 min)"
  node render.js --sub 3 --ar "$AR" --out "master-$AR.mp4"

  echo "==> mux + deliver $AR"
  "$FF" -hide_banner -loglevel error -y -i "master-$AR.mp4" -i mix.wav \
    -c:v libx264 -preset slow -crf 19 -tune film -pix_fmt yuv420p \
    -x264-params "aq-mode=3" \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 192k -ar 48000 -ac 2 \
    -movflags +faststart -shortest "$OUT/repairo-social-$AR.mp4"
done

echo "==> poster frame"
"$FF" -hide_banner -loglevel error -y -ss 33.6 -i "$OUT/repairo-social-9x16.mp4" \
  -frames:v 1 -q:v 2 "$OUT/repairo-social-poster.jpg"

ls -la "$OUT"
