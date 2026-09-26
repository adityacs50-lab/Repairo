// Render film.html frame-by-frame (every frame a pure function of t) and pipe to ffmpeg.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FPS = 30, DUR = 25;
const [mode = "video", ...rest] = process.argv.slice(2);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(here, "film.html"));
await page.evaluate(() => window.ready);

if (mode === "stills") {
  for (const t of rest.map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(here, "stills", `t${t.toFixed(2)}.png`) });
  }
} else {
  const out = path.join(here, "video-only.mp4");
  const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out],
    { stdio: ["pipe", "inherit", "inherit"] });
  const N = FPS * DUR;
  for (let i = 0; i < N; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 60 === 0) process.stderr.write(`frame ${i}/${N}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
}
await browser.close();
