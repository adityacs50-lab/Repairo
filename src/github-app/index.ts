import { getDb } from "../db";
import { registerInstallationHandlers } from "./installations";
import { logger } from "./logger";
import { createGitHubApp, GitHubAppClients, loadConfig } from "./octokit";
import { createServer } from "./server";
import { registerPullRequestHandlers } from "./webhooks";

/**
 * Repairo GitHub App entry point.
 *
 * Listens for pull_request and installation webhooks, diffs OpenAPI specs
 * touched by a PR, and comments when the change would break API consumers.
 */
/** Load .env.local / .env when present (no-op in Docker, where env is injected). */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* file missing — fine */
    }
  }
}

function main() {
  loadEnvFiles();
  const config = loadConfig();
  const db = getDb(logger);
  logger.info({ path: db.path }, "database ready");
  const app = createGitHubApp(config);
  const clients = new GitHubAppClients(config);

  registerInstallationHandlers(app, { db, onDeleted: (id) => clients.forget(id) });
  registerPullRequestHandlers(app, { db, getClient: (id) => clients.forInstallation(id) });

  const server = createServer(app).listen(config.port, () => {
    logger.info({ port: config.port, app_id: config.appId }, "Repairo GitHub App listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
