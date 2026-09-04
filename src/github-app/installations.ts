import type { App } from "@octokit/app";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import type { AppDatabase } from "../db";
import { logger } from "./logger";

export interface InstallationHandlerDeps {
  db: AppDatabase;
  /** Called after an installation is removed, e.g. to drop cached tokens. */
  onDeleted?: (installationId: number) => void;
}

type InstallationPayload = EmitterWebhookEvent<"installation">["payload"];

export function registerInstallationHandlers(app: App, deps: InstallationHandlerDeps) {
  app.webhooks.on("installation.created", ({ payload }) => {
    handleInstallationCreated(payload, deps);
  });
  app.webhooks.on("installation.deleted", ({ payload }) => {
    handleInstallationDeleted(payload, deps);
  });
}

export function handleInstallationCreated(payload: InstallationPayload, deps: InstallationHandlerDeps) {
  const installationId = payload.installation.id;
  const orgName = accountName(payload.installation.account);
  const stored = deps.db.upsertInstallation(installationId, orgName);
  logger.info(
    { installation_id: installationId, org: orgName, repos: payload.repositories?.length ?? 0, stored },
    "installation created",
  );
}

export function handleInstallationDeleted(payload: InstallationPayload, deps: InstallationHandlerDeps) {
  const installationId = payload.installation.id;
  const removed = deps.db.deleteInstallation(installationId);
  deps.onDeleted?.(installationId);
  logger.info(
    { installation_id: installationId, org: accountName(payload.installation.account), removed },
    "installation deleted",
  );
}

/** Orgs and users have `login`; enterprise accounts only have `slug`. */
function accountName(account: InstallationPayload["installation"]["account"]): string {
  if (account && "login" in account && account.login) return account.login;
  if (account && "slug" in account && account.slug) return account.slug;
  return "unknown";
}
