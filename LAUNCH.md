# Launch Repairo (LinkedIn + production)

Use this checklist so people from LinkedIn can try a **real repair on their GitHub repo**.

## 1. Create a GitHub OAuth App

1. https://github.com/settings/developers → **New OAuth App**
2. Homepage URL: `https://YOUR_DOMAIN`
3. Callback URL: `https://YOUR_DOMAIN/api/auth/callback`
4. Copy Client ID + Secret into env

Scopes used: `repo`, `read:user`

## 2. Deploy (Vercel frontend + Railway backend)

Follow **[DEPLOY.md](DEPLOY.md)** — API/SQLite on Railway, UI on Vercel with `/api` rewrites.

Quick summary:

1. Deploy Docker app on **Railway** (volume at `/app/data`) → get Railway URL  
2. Deploy same repo on **Vercel** with `BACKEND_URL=<Railway URL>` and `APP_URL=<Vercel URL>`  
3. GitHub OAuth callback = `https://YOUR-VERCEL-URL/api/auth/callback`  
4. Set `APP_URL` on Railway to the Vercel URL and redeploy  

Smoke: `https://YOUR-VERCEL-URL/api/health` must return `{ "ok": true }`.

## 3. Smoke test before posting

1. Open `/` → **Try on your GitHub repo**
2. Sign in with GitHub
3. **Try your repo** tab → pick a repo with OpenAPI + TS consumers
4. Run repair → **Open pull request on GitHub**
5. Confirm the PR appears on github.com

Fixture fallback: `/demo` (no GitHub needed for investors).

## 4. LinkedIn post (copy/paste)

```
I built Repairo — self-maintaining APIs (Dependabot for OpenAPI).

API vendors ship breaking changes. Changelogs don’t get read. Downtime follows.

Repairo connects the contract to your codebase:
1. Diffs OpenAPI before → after
2. Scans TypeScript for impacted usages
3. Opens a repair PR you review and merge

Providers shouldn’t just announce changes — they should apply them.

Try it on your own repo:

👉 [YOUR_DOMAIN]
→ Connect GitHub
→ Pick OpenAPI paths + consumer files
→ Open a real PR

No sales call. Review the PR before merge.

Early access — looking for design partners who ship API consumers in TypeScript.

#buildinpublic #apis #devtools #github #yc
```

Screenshot tips for the post:

- Landing hero with **Try on your GitHub repo**
- App **Try your repo** form filled with a real repo path
- The opened PR on GitHub (best social proof)

## 5. What to tell customers

| Do | Don't |
|----|--------|
| Review every PR | Auto-merge without CI |
| Use same OpenAPI path + two git tags/refs | Expect every language to auto-patch |
| Start with a non-prod repo | Expect full coverage of custom SDKs |

Supported safe transforms today: base URL bumps, required fields, status enum renames in TypeScript consumers.
