const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const { once } = require('events');
const path = require('path');

// Chromium to drive. Override with PW_CHROME=/path/to/chrome.
const CHROME = process.env.PW_CHROME
  || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = require('ffmpeg-static');

(async () => {
  const A = process.argv.slice(2);
  const get = (k, d) => A.includes(k) ? A[A.indexOf(k) + 1] : d;
  const SUB = Number(get('--sub', 3));
  const OUT = get('--out', 'master.mp4');
  const AR  = get('--ar', '9x16');
  const W   = Number(get('--w', 1080));
  const H   = Number(get('--h', AR === '1x1' ? 1080 : 1920));

  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--force-color-profile=srgb','--disable-lcd-text','--font-render-hinting=none',
           '--hide-scrollbars','--disable-gpu','--no-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve('scene.html') + '?ar=' + AR);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  const FPS = await page.evaluate(() => window.__FPS);
  const D   = await page.evaluate(() => window.__D);
  const TOTAL = Math.round(D * FPS);

  // shutter: average SUB subframes -> one output frame
  const vf = SUB > 1
    ? `tmix=frames=${SUB}:weights='${Array(SUB).fill(1).join(' ')}',select='eq(mod(n\\,${SUB})\\,${SUB-1})',setpts=N/${FPS}/TB`
    : `null`;

  const ff = spawn(FFMPEG, [
    '-hide_banner','-loglevel','error','-y',
    '-f','image2pipe','-vcodec','mjpeg','-r', String(FPS*SUB), '-i','-',
    '-vf', vf,
    '-r', String(FPS),
    '-c:v','libx264','-preset','slow','-crf','12','-pix_fmt','yuv420p',
    '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
    OUT
  ], { stdio: ['pipe','inherit','inherit'] });

  const t0 = Date.now();
  for (let f = 0; f < TOTAL; f++) {
    for (let s = 0; s < SUB; s++) {
      const t = (f + s / SUB) / FPS;
      await page.evaluate(t => window.__seek(t), t);
      const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
      if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    }
    if (f % 120 === 0) {
      const el = (Date.now() - t0) / 1000;
      process.stderr.write(`  ${f}/${TOTAL}  ${el.toFixed(0)}s  eta ${(el / (f + 1) * (TOTAL - f - 1)).toFixed(0)}s\n`);
    }
  }
  ff.stdin.end();
  await once(ff, 'close');
  await browser.close();
  process.stderr.write(`done -> ${OUT} in ${((Date.now()-t0)/1000).toFixed(0)}s\n`);
})();
