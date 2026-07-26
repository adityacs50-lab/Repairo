# Repairo launch video (screen-record)

I can’t upload an MP4 from the agent, but you have a **cinematic autoplay reel** built into the product.

## Record in 2 minutes

1. Open **https://repairo-steel.vercel.app/video** (or `http://localhost:3000/video`)
2. Go fullscreen (`F11` or browser fullscreen)
3. Hide the browser UI / use Loom or OBS → **record tab**
4. Let it loop once (~30–35s) or twice for a longer cut
5. Optional: mute UI clicks; add voiceover from the script below

Controls on the reel: **Pause / Next / Exit**. Progress bar at the bottom.

---

## Narration script (~60–75s)

*(Speak calmly, product-demo energy — not hype.)*

**[Scene 1 — logo]**  
This is Repairo — Dependabot for APIs.

**[Scene 2 — problem]**  
API communication is broken. Vendors ship breaking changes with little warning. Changelogs don’t get read. And a huge share of outages still come from external API changes going unnoticed.

**[Scene 3 — product]**  
Repairo connects the contract to your codebase. We diff OpenAPI, map impact in your TypeScript consumers, and open a safe pull request.

**[Scene 4 — agent]**  
Install a vendor agent — like Stripe. We watch the public OpenAPI, scan your repo, and apply the fix when the contract moves.

**[Scene 5 — PR]**  
You get a real GitHub PR: blast radius, deterministic patches, safety score. You review. You merge. Nothing silent.

**[Scene 6 — CTA]**  
Try it on your own GitHub. Early access — repairo-steel.vercel.app.

---

## Shot list if you also film the live product

| Shot | Where | What to show |
|------|--------|--------------|
| 1 | `/` | Hero + CTA |
| 2 | `/app` | Sign in with GitHub |
| 3 | Vendor agents | Install Stripe agent |
| 4 | Watch → Run now | Pipeline running |
| 5 | GitHub | Opened PR |

Cut those after the reel for a “proof” ending.

---

## Export tips

- **Loom**: Chrome tab record, 1080p, no webcam for launch cut  
- **OBS**: Window capture `/video`, 1920×1080, 30fps  
- Add soft music under −20dB if you want; keep voice clear  
- End card: logo + URL for 3 seconds
