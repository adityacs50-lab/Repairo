export function getAppUrl() {
  if (process.env.APP_URL?.trim()) return process.env.APP_URL.trim().replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  if (process.env.VERCEL_URL?.trim()) return `https://${process.env.VERCEL_URL.trim()}`;
  if (process.env.RAILWAY_PUBLIC_DOMAIN?.trim()) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim()}`;
  return "http://localhost:3000";
}



export function getGitHubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const sessionSecret = process.env.SESSION_SECRET?.trim();

  if (!clientId || !clientSecret || !sessionSecret) {
    return null;
  }

  if (sessionSecret.length < 32) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    sessionSecret,
    appUrl: getAppUrl(),
    callbackUrl: `${getAppUrl()}/api/auth/callback`,
    scopes: "repo read:user",
  };
}

export function githubConfigured() {
  return getGitHubOAuthConfig() !== null;
}

/**
 * The `redirect_uri` to send GitHub, or `undefined` to let GitHub fall back to
 * the callback URL registered on the OAuth App itself.
 *
 * Single source of truth on purpose: GitHub requires the authorize request and
 * the token exchange to send the *same* value, and rejects the exchange with
 * `redirect_uri_mismatch` when they disagree. Previously the authorize step sent
 * nothing (deferring to the registered callback) while the token exchange sent
 * `getAppUrl() + /api/auth/callback`, so any deployment whose APP_URL did not
 * exactly equal the registered callback failed at the exchange.
 *
 * Defaults to `undefined` — deferring to the OAuth App registration is the
 * behavior that needs no environment configuration to be correct.
 */
export function getExplicitRedirectUri(): string | undefined {
  if (process.env.EXPLICIT_REDIRECT_URI !== "true") return undefined;
  const explicit = process.env.GITHUB_CALLBACK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${getAppUrl()}/api/auth/callback`;
}
