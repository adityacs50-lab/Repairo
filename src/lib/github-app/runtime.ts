import type { App } from "@octokit/app";
import { getDb } from "@/db";
import { registerInstallationHandlers } from "@/github-app/installations";
import { logger } from "@/github-app/logger";
import { createGitHubApp, GitHubAppClients, type AppConfig } from "@/github-app/octokit";
import { registerPullRequestHandlers } from "@/github-app/webhooks";
import { requireGitHubAppConfig } from "./status";

export interface GitHubAppRuntime {
  app: App;
  config: AppConfig;
}

let runtime: GitHubAppRuntime | undefined;

/** Lazily wire handlers once per serverless instance / Node process. */
export function getGitHubAppRuntime(): GitHubAppRuntime {
  if (runtime) return runtime;

  const config = requireGitHubAppConfig();
  const db = getDb(logger);
  const app = createGitHubApp(config);
  const clients = new GitHubAppClients(config);

  registerInstallationHandlers(app, { db, onDeleted: (id) => clients.forget(id) });
  registerPullRequestHandlers(app, { db, getClient: (id) => clients.forInstallation(id) });

  runtime = { app, config };
  return runtime;
}
