# Deploy on Vercel

Production runs as a **single Next.js app on Vercel**. Pages (`/`, `/demo`, `/app`) and API routes (`/api/*`) execute in the same deployment — there is **no** separate Railway backend and **no** `/api` proxy.

```text
Browser  →  Vercel (UI + /api/auth, /api/repair, webhooks, cron, …)
                │
                └── Neon Postgres (DATABASE_URL / POSTGRES_URL)
```

Do **not** set `BACKEND_URL` on Vercel unless you are deliberately proxying some routes to another host (legacy). Leaving it unset is correct for heyrepairo.in-style deploys.

## Order of operations

1. Create a **Neon** database (or Vercel → Storage → Postgres) and copy the connection string.
2. Import the repo on **Vercel** → add environment variables below.
3. Add `DATABASE_URL` (and prefer `DATABASE_URL_UNPOOLED` for Neon migrations) on Vercel **before** the first production deploy — `vercel.json` runs `npm run db:migrate` before `next build`.
4. Create a **GitHub OAuth App** with callback on your Vercel domain.
5. Deploy → smoke test `/api/health`, `/demo`, `/app` → **Continue with GitHub**.

If OAuth fails with “Failed query” or “relation users does not exist”, the schema was never applied — redeploy with `DATABASE_URL` set, or run `npm run db:migrate` locally against the same Neon URL.

---

## Vercel environment variables

**Project → Settings → Environment Variables** (Production, Preview, and Development as needed).

### Required (hosted `/app` + Quick Repair)

| Variable | Value |
|----------|--------|
| `APP_URL` | Public site URL, no trailing slash — e.g. `https://www.heyrepairo.in` |
| `DATABASE_URL` | Neon connection string (or use `POSTGRES_URL` from Vercel Postgres) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App |
| `SESSION_SECRET` | 32+ random characters (`openssl rand -base64 32`) |

Optional but recommended:

| Variable | Value |
|----------|--------|
| `TOKEN_ENCRYPTION_KEY` | 32+ chars — encrypts stored GitHub tokens at rest |
| `NEXT_PUBLIC_GITHUB_APP_SLUG` | Slug from `https://github.com/apps/<slug>` — Install App CTA |
| `APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET` | GitHub App — webhooks at `{APP_URL}/api/github/webhooks` |

### Optional

| Variable | Purpose |
|----------|---------|
| `SARVAM_API_KEY` | Otto chat widget (`/api/chat`) |
| `SARVAM_MODEL`, `SARVAM_BASE_URL`, `SARVAM_REASONING_EFFORT` | Otto tuning |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET` | Pro billing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout UI |
| `CRON_SECRET` | Protect `/api/cron/poll-vendors` (Vercel Cron in `vercel.json` also runs daily) |
| `ANTHROPIC_API_KEY` | Not used by the website — CLI `--agent-resolve` only |
| `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google waitlist sign-in (if enabled) |

After changing secrets, **redeploy** Vercel so serverless functions pick them up.

---

## GitHub OAuth App

1. https://github.com/settings/developers → **OAuth Apps** → New (or edit existing)
2. **Homepage URL:** `https://YOUR-VERCEL-DOMAIN`
3. **Authorization callback URL:** `https://YOUR-VERCEL-DOMAIN/api/auth/callback`
4. Copy **Client ID** and generate **Client secret** → set on **Vercel** (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`), not Railway.
5. Set `APP_URL` on Vercel to the same domain (including `www` if that is canonical).
6. Redeploy.

If login fails with `redirect_uri_mismatch`, either register the exact callback above on the OAuth App, or set `EXPLICIT_REDIRECT_URI=true` and `GITHUB_CALLBACK_URL` to that same URL.

---

## Stripe billing (optional, required for Pro)

1. Stripe → Product “Repairo Pro” → **$29/mo** price → copy `price_…`
2. On **Vercel**: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`
3. Webhook endpoint: `https://YOUR-VERCEL-DOMAIN/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Redeploy → `/api/health` should report `"stripe": true` when configured.

---

## Vendor OpenAPI polling (cron)

`vercel.json` schedules `/api/cron/poll-vendors` daily. Set `CRON_SECRET` on Vercel and ensure the cron route checks it (or use GitHub Actions — see `.github/workflows/vendor-poll-cron.yml` with `CRON_TARGET_URL` = your Vercel URL).

Manual trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://YOUR-VERCEL-DOMAIN/api/cron/poll-vendors"
```

---

## Smoke test

1. `https://YOUR-VERCEL-DOMAIN/api/health` → `{ "ok": true, ... }`
2. `/app` → **Continue with GitHub** → authorize
3. Connect a repo → run repair → **Open pull request**
4. `/demo` — fixture flow without OAuth
5. Install **GitHub App** from the site CTA (separate from OAuth)

---

## Custom domain

- Add apex/www on **Vercel**
- Update `APP_URL` to the canonical domain
- Update GitHub OAuth homepage + callback URLs
- Redeploy

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “OAuth not configured” on `/app` | Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` on **Vercel** and redeploy |
| OAuth lands then fails | Callback URL must match OAuth App registration; `APP_URL` must match the URL users open |
| DB errors / empty workspace | `DATABASE_URL` missing or migrations not applied (`npm run db:migrate`) |
| `BACKEND_URL` set | Unset it on Vercel unless you still proxy to another API host |
| Stripe checkout OK but plan stays free | Webhook URL + `STRIPE_WEBHOOK_SECRET` on Vercel |
| Otto chat unavailable | `SARVAM_API_KEY` on Vercel (optional product surface) |

---

## Optional: Docker / Railway (self-host)

`Dockerfile` + `railway.toml` remain for running a **standalone** Node image (e.g. local Docker, `OUTPUT_STANDALONE=1`). That path is **not** the current heyrepairo.in architecture. For the public product, use Vercel + Neon only.

---

## LinkedIn / launch copy

Use your Vercel URL in posts. See [LAUNCH.md](LAUNCH.md) if present.
