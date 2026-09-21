# Repairo — social film

A 35.5s brand film for Reels / Shorts / TikTok / LinkedIn / X. Built from the
`DESIGN.md` tokens (warm canvas `#2b2622`, off-white ink, Inter + DM Mono,
Pixelify wordmark), not from stock footage — every frame is the product's own
visual language.

| File | Format | Use |
| --- | --- | --- |
| `repairo-social-9x16.mp4` | 1080×1920, 60 fps | Reels, Shorts, TikTok, LinkedIn video, Stories |
| `repairo-social-1x1.mp4` | 1080×1080, 60 fps | X, LinkedIn feed, Instagram feed |
| `repairo-social-poster.jpg` | 1080×1920 | Thumbnail / cover frame |
| `repairo-social.srt` | — | Caption track for YouTube / LinkedIn |
| `CAPTIONS.md` | — | Ready-to-paste post copy per platform |

## The cut

| Beat | Time | What's on screen |
| --- | --- | --- |
| Cold open | 0.0–3.4s | `npm run build` fails — 14 TS2353 errors you didn't cause |
| Hook | 2.3–3.4s | "You didn't change a single line." |
| Title | 3.4–7.4s | Dependabot bumps the package. Repairo fixes the call sites that break. |
| 01 Detect | 7.4–13.6s | OpenAPI diff, `max_tokens` → `max_output_tokens`, BREAKING chip |
| 02 Map | 13.6–19.6s | AST scan sweep across 24 files, 14 call sites light up |
| 03 Repair | 19.6–26.0s | Deterministic transform, then `tsc --noEmit` → 0 errors |
| 04 Propose | 26.0–31.0s | PR card with evidence; human review required |
| Lockup | 31.0–35.5s | Wordmark, tagline, `npx repairo-cli scan ./src`, heyrepairo.in |

## How it's made

Motion graphics are rendered deterministically, not recorded:

- `scene.html` is a single page whose entire timeline is a pure function of
  time — `window.__seek(t)` sets every transform and opacity for that instant.
  No CSS animations, no `requestAnimationFrame`, so any frame is reproducible.
- Playwright steps the page frame by frame and pipes JPEGs straight into
  ffmpeg — nothing is written to disk between the two.
- **Shutter motion blur** is real: three sub-frames are rendered per output
  frame and averaged (`tmix`), so fast moves smear the way a camera would and
  static type stays sharp.
- Aspect ratios are re-framed, not re-laid-out: the square cut pans and scales
  the same 1080×1920 world per scene, the way an editor would reframe.
- Audio is the repo's own `public/music/bg-music.mp3` under a synthesized
  sound-design bed (sub impacts, risers, UI ticks, convolution reverb),
  side-chained to the music and mastered to −14 LUFS / −1 dBTP.

## Re-cutting it

Everything needed is in `src/`:

| File | What it is |
| --- | --- |
| `scene.html` | The whole film — layout, timeline, easing. `window.__seek(t)` draws any instant. |
| `render.js` | Playwright frame-stepper; pipes JPEGs into ffmpeg with sub-frame shutter blur |
| `preview.js` | Screenshot single timestamps while you're editing (`node preview.js --t 16.5`) |
| `sfx.py` | Synthesizes the sound-design bed, scored against the same timeline |
| `build.sh` | Fonts → sfx → mix → both renders → deliverables |
| `fetch-fonts.py` | Pulls Inter / DM Mono / Pixelify Sans into `src/fonts2/` |

```bash
cd docs/assets/social/src
npm i ffmpeg-static playwright-core
pip install numpy
PW_CHROME=/path/to/chrome bash build.sh     # ~45 min, writes into ../
```

To change copy, edit the `TERM`, `SPEC`, `CODE`, `FILES` and `PRROWS` arrays
near the top of `scene.html`'s script block; the scene table (`SC`), the cut
list (`CUTS`) and the chyrons (`CHY`) are right below them. If you move a beat,
move the matching cue in `sfx.py` — the two scores are kept in sync by hand.

See `CAPTIONS.md` for the licensing note on the music bed.
