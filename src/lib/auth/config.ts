export function getAppUrl() {
  return (
    process.env.APP_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  );
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
