# Deploy: Vercel (frontend) + Railway (backend)

Repairo’s API uses SQLite + Node native modules, so **the backend must run on Railway**.  
Vercel serves the UI and proxies `/api/*` to Railway.

```text
Browser  →  Vercel (pages, /app, /demo)
                │
                └── /api/*  rewrite  →  Railway (OAuth, repair, PRs, SQLite, webhooks)
```

## Order of operations

1. Deploy **Railway** first (get a public URL)
2. Deploy **Vercel** with `BACKEND_URL` = that Railway URL
3. Set `APP_URL` on **both** to your **Vercel** URL
4. Point GitHub OAuth callback at the **Vercel** URL

---

## A. Railway (backend)

1. Push this repo to GitHub
2. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Railway will use `Dockerfile` via [`railway.toml`](railway.toml)
4. **Add a volume** mounted at `/app/data` (SQLite persistence)
5. Variables:

| Variable | Value |
|----------|--------|
| `APP_URL` | Your Vercel URL later, e.g. `https://repairo.vercel.app` (can update after Vercel deploy) |
| `GITHUB_CLIENT_ID` | from GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | from GitHub OAuth App |
| `SESSION_SECRET` | 32+ random characters |
| `TOKEN_ENCRYPTION_KEY` | optional, same strength |
| `DATABASE_PATH` | `/app/data/repairo.db` |
| `PORT` | `3000` (Railway usually injects this) |

6. Generate a public domain: **Settings → Networking → Generate domain**  
   Example: `https://repairo-production.up.railway.app`
7. Check: `https://YOUR-RAILWAY-DOMAIN/api/health` → `{ "ok": true, ... }`

Do **not** set `BACKEND_URL` on Railway.

---

## B. Vercel (frontend)

1. [Vercel](https://vercel.com) → **Add New Project** → import the same GitHub repo
2. Framework: Next.js (auto)
3. Environment variables:

| Variable | Value |
|----------|--------|
| `BACKEND_URL` | `https://YOUR-RAILWAY-DOMAIN` (no trailing slash) |
| `APP_URL` | `https://YOUR-VERCEL-DOMAIN` (e.g. `https://repairo.vercel.app`) |

4. Deploy
5. Open the Vercel URL — UI loads from Vercel; API calls go to Railway via rewrite

You do **not** need GitHub/Stripe secrets on Vercel if all `/api` traffic is rewritten.

---

## C. GitHub OAuth App

1. https://github.com/settings/developers → **OAuth Apps** → New
2. **Homepage URL:** `https://YOUR-VERCEL-DOMAIN`
3. **Authorization callback URL:** `https://YOUR-VERCEL-DOMAIN/api/auth/callback`
4. Put Client ID + Secret on **Railway** (not required on Vercel)
5. Update Railway `APP_URL` to the Vercel URL if you hadn’t yet → **redeploy Railway**

---

## C2. Stripe billing (optional but required for Pro)

1. Create a Stripe account → **Product** “Repairo Pro” → recurring **$29/mo** price  
2. Copy the **Price ID** (`price_…`) into Railway as `STRIPE_PRICE_PRO`  
3. Railway vars:

| Variable | Value |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_…` or `sk_test_…` |
| `STRIPE_PRICE_PRO` | `price_…` |
| `STRIPE_WEBHOOK_SECRET` | from step 4 |

4. Stripe Dashboard → **Developers → Webhooks → Add endpoint**  
   - URL: `https://YOUR-VERCEL-DOMAIN/api/webhooks/stripe` (proxied to Railway)  
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`  
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`  
5. Redeploy Railway. Health should show `"stripe": true`.  
6. Smoke: `/app` → Settings → **Upgrade to Pro** → complete Checkout → plan becomes `pro`.

Plans: **Free** = 1 integration, 15 runs/mo, 3 seats · **Pro** = 50 / 500 / 15.

---

## C3. Vendor OpenAPI polling (cron)

So agents check remote specs without clicking **Run now**:

1. Set `CRON_SECRET` on Railway (long random string)
2. Call hourly (GitHub Actions, cron-job.org, or Railway cron):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR-VERCEL-DOMAIN/api/cron/poll-vendors"
```

Or set `VENDOR_POLL_MS=3600000` on Railway for an in-process hourly poller (no external cron).

---

## D. Smoke test

1. `https://YOUR-VERCEL-DOMAIN/api/health` — should proxy Railway and return `ok`
2. `/app` → **Continue with GitHub** → authorize
3. **Try your repo** → run repair → **Open pull request**
4. Confirm PR on github.com

Fixture demo: `/demo` (also uses `/api/repair` via Railway).

---

## E. Custom domain (optional)

- Apex/www on **Vercel**
- Set `APP_URL` to that domain on Railway + Vercel
- Update GitHub OAuth homepage + callback to the custom domain
- Redeploy both

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OAuth lands then fails | Callback URL must match Vercel `APP_URL` exactly; Railway `APP_URL` same |
| `/api/health` 502 on Vercel | `BACKEND_URL` wrong or Railway sleeping/crashed |
| Cookie / signed-out after login | Same `APP_URL` on Railway; don’t open Railway URL for login — use Vercel |
| Webhook never fires | Integration webhook URL uses `APP_URL` (Vercel); Vercel must rewrite `/api/webhooks/*` |
| Data lost on Railway restart | Attach volume at `/app/data` |
| Stripe checkout works but plan stays free | Webhook URL must hit Vercel `/api/webhooks/stripe`; check `STRIPE_WEBHOOK_SECRET` |
| Upgrade button missing | Stripe vars not set — health shows `"stripe": false` |

---

## LinkedIn

Use the Vercel URL in your post. Full copy: [LAUNCH.md](LAUNCH.md).
