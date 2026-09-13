import { loadConfig, type AppConfig } from "@/github-app/octokit";

export interface GitHubAppStatus {
  configured: boolean;
  appId: number | null;
  missing: string[];
  webhookPath: string;
  installUrl: string | null;
}

function missingConfigKeys(env: Record<string, string | undefined> = process.env): string[] {
  const appId = Number(env.APP_ID);
  const privateKey = (env.PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  const webhookSecret = (env.WEBHOOK_SECRET ?? "").trim();
  const missing: string[] = [];
  if (!Number.isInteger(appId) || appId <= 0) missing.push("APP_ID");
  if (!privateKey) missing.push("PRIVATE_KEY");
  if (!webhookSecret) missing.push("WEBHOOK_SECRET");
  return missing;
}

/** Public slug at https://github.com/apps/repairo-ai */
const DEFAULT_GITHUB_APP_SLUG = "repairo-ai";

export function getGitHubAppSlug(
  slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG?.trim() ||
    process.env.GITHUB_APP_SLUG?.trim() ||
    DEFAULT_GITHUB_APP_SLUG,
): string {
  return slug;
}

export function getGitHubAppInstallUrl(slug?: string): string {
  return `https://github.com/apps/${getGitHubAppSlug(slug)}/installations/new`;
}

/** Non-throwing probe for health checks and docs. */
export function probeGitHubAppStatus(env: Record<string, string | undefined> = process.env): GitHubAppStatus {
  const missing = missingConfigKeys(env);
  const appIdRaw = Number(env.APP_ID);
  const appId = Number.isInteger(appIdRaw) && appIdRaw > 0 ? appIdRaw : null;

  return {
    configured: missing.length === 0,
    appId,
    missing,
    webhookPath: "/api/github/webhooks",
    installUrl: getGitHubAppInstallUrl(),
  };
}

/** Load validated GitHub App config or throw with a clear message. */
export function requireGitHubAppConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  return loadConfig(env);
}
