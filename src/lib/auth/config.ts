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
