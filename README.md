# Repairo

Self-maintaining API integrations — detect OpenAPI drift, map consumer impact, open safe GitHub PRs.

## Product

| Surface | Purpose |
|---------|---------|
| `/` | Marketing |
| `/demo` | Fixture playground (no GitHub required) |
| `/app` | SaaS dashboard — integrations, runs, billing, settings |

### SaaS v1 features

- GitHub OAuth sign-in + encrypted token storage
- Workspaces (Free / Pro) with member invites
- Saved **integrations** (repo + OpenAPI/consumer paths)
- GitHub **webhooks** → auto repair → open PR
- Manual **Run now** + run history
- Stripe Checkout / Customer Portal (optional env)

## Quick start

```bash
npm install
cp .env.example .env.local
# fill GITHUB_* and SESSION_SECRET (32+ chars)
npm run dev
```

- Demo: http://localhost:3000/demo  
- App: http://localhost:3000/app  

```bash
npm run demo:engine
```

## Launch on LinkedIn

See **[LAUNCH.md](LAUNCH.md)** for LinkedIn copy and smoke tests.  
See **[DEPLOY.md](DEPLOY.md)** for **Vercel (frontend) + Railway (backend)**.

**Customer path:** `/app` → **Try your repo** → open a real GitHub PR.

## Production checklist

1. **GitHub OAuth App** — callback `https://YOUR_DOMAIN/api/auth/callback` (`repo`, `read:user`)
2. **Public `APP_URL`** — required for OAuth + webhooks
3. **Secrets** — `SESSION_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
4. **Stripe (optional)** — Free plan works without it
5. Smoke test `/api/health` then one real PR from `/app`

### Docker

```bash
cp .env.example .env.local
# fill env; set APP_URL to your public URL
docker compose up --build
```

SQLite data persists in the `repairo-data` volume.

## Plans

- **Free:** 1 watched integration  
- **Pro:** up to 50 integrations (Stripe)

Without Stripe env, Free still works; billing UI shows setup instructions.

## API map

| Path | Notes |
|------|--------|
| `GET/POST /api/repair` | Fixture / paste repair |
| `GET /api/auth/*` | OAuth + session |
| `GET/POST /api/integrations` | List / create |
| `PATCH/DELETE /api/integrations/:id` | Update / delete |
| `POST /api/integrations/:id/run` | Manual repair + PR |
| `GET /api/runs` | Run history |
| `GET/PATCH /api/workspace` | Settings + invite |
| `POST /api/billing/checkout` | Stripe Checkout |
| `POST /api/billing/portal` | Stripe portal |
| `POST /api/webhooks/github` | Repo push → repair |
| `POST /api/webhooks/stripe` | Plan sync |

## Stack

Next.js · TypeScript · Drizzle + SQLite · Stripe · GitHub OAuth · OpenAPI diff engine
