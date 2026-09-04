import type { App } from "@octokit/app";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import type { AppDatabase } from "../db";
import { runOasdiff, type BreakingChange, type OasdiffInput, type OasdiffResult } from "../oasdiff/oasdiff";
import { logger } from "./logger";
import type { GitHubClient } from "./octokit";

// ---------------------------------------------------------------------------
// Spec file detection
// ---------------------------------------------------------------------------

const SPEC_FILENAMES = new Set([
  "openapi.yaml",
  "openapi.yml",
  "openapi.json",
  "swagger.yaml",
  "swagger.yml",
  "swagger.json",
]);

/** True for openapi.*, swagger.*, and any YAML inside an `api/spec/` directory. */
export function isOpenApiSpecPath(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  if (SPEC_FILENAMES.has(name.toLowerCase())) return true;
  return /(^|\/)api\/spec\/[^/]+\.ya?ml$/i.test(path);
}

// ---------------------------------------------------------------------------
// PR comment
// ---------------------------------------------------------------------------

export interface SpecBreakingChanges {
  specPath: string;
  changes: BreakingChange[];
}

/** Hidden marker so a later push updates our comment instead of adding another. */
export const COMMENT_MARKER = "<!-- repairo:breaking-api-changes -->";

export function formatBreakingChangesComment(specs: SpecBreakingChanges[]): string {
  const multiSpec = specs.length > 1;
  const rows = specs.flatMap(({ specPath, changes }) =>
    changes.map((c) => {
      const details = multiSpec ? `\`${specPath}\`: ${c.details}` : c.details;
      return `| ${cell(c.rule)} | ${cell(c.endpoint)} | ${cell(details)} |`;
    }),
  );

  return [
    COMMENT_MARKER,
    "## ⚠️ Breaking API Changes Detected",
    "",
    "| Rule | Endpoint | Details |",
    "|------|----------|---------|",
    ...rows,
    "",
    "**Action required**: These changes will break downstream API consumers.",
    "- [ ] Add deprecation headers and sunset date",
    "- [ ] Notify consumer teams",
    "- [ ] Update API versioning strategy",
    "",
    "_Detected by Repairo_",
  ].join("\n");
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

// ---------------------------------------------------------------------------
// pull_request handler
// ---------------------------------------------------------------------------

export interface PullRequestHandlerDeps {
  db: AppDatabase;
  getClient: (installationId: number) => Promise<GitHubClient>;
  /** Defaults to the oasdiff wrapper; injectable for tests. */
  diff?: (input: OasdiffInput) => Promise<OasdiffResult>;
}

export type PullRequestPayload = EmitterWebhookEvent<
  "pull_request.opened" | "pull_request.synchronize"
>["payload"];

export interface PullRequestOutcome {
  status: "no-installation" | "no-spec-change" | "no-breaking" | "commented";
  breaking: number;
  commentId?: number;
}

export function registerPullRequestHandlers(app: App, deps: PullRequestHandlerDeps) {
  app.webhooks.on(["pull_request.opened", "pull_request.synchronize"], async ({ payload }) => {
    await handlePullRequest(payload, deps);
  });
}

export async function handlePullRequest(
  payload: PullRequestPayload,
  deps: PullRequestHandlerDeps,
): Promise<PullRequestOutcome> {
  const { repository, pull_request: pr, installation } = payload;
  const owner = repository.owner.login;
  const name = repository.name;
  const repo = repository.full_name;
  const log = logger.child({ repo, pr_number: pr.number, installation_id: installation?.id ?? null });

  if (!installation) {
    log.warn("pull_request event has no installation; skipping");
    return { status: "no-installation", breaking: 0 };
  }

  const client = await deps.getClient(installation.id);
  const files = await client.listPullRequestFiles(owner, name, pr.number);
  const specFiles = files.filter((f) => isOpenApiSpecPath(f.filename));
  if (specFiles.length === 0) {
    log.debug({ files: files.length }, "no OpenAPI spec files changed");
    return { status: "no-spec-change", breaking: 0 };
  }

  log.info(
    { specs: specFiles.map((f) => f.filename) },
    `OpenAPI spec change detected in ${repo}#${pr.number}`,
  );

  const diff = deps.diff ?? runOasdiff;
  const results: SpecBreakingChanges[] = [];
  for (const file of specFiles) {
    if (file.status === "added") continue; // nothing existed before, nothing can break

    const basePath = file.previous_filename ?? file.filename;
    const base = await client.getFileText(owner, name, basePath, pr.base.sha);
    const head = file.status === "removed" ? null : await client.getFileText(owner, name, file.filename, pr.head.sha);

    try {
      const result = await diff({ base, head });
      log.debug({ spec: file.filename, engine: result.engine, breaking: result.breaking.length }, "spec diffed");
      if (result.breaking.length) results.push({ specPath: file.filename, changes: result.breaking });
    } catch (error) {
      log.warn({ spec: file.filename, err: error }, "could not diff spec; skipping");
    }
  }

  const total = results.reduce((sum, r) => sum + r.changes.length, 0);
  if (total === 0) {
    log.info("no breaking API changes found");
    return { status: "no-breaking", breaking: 0 };
  }

  log.info(
    { breaking: total, rules: results.flatMap((r) => r.changes.map((c) => c.rule)) },
    "breaking API changes found",
  );

  const body = formatBreakingChangesComment(results);
  const existing = (await client.listIssueComments(owner, name, pr.number)).find((c) =>
    c.body?.includes(COMMENT_MARKER),
  );
  const comment = existing
    ? await client.updateIssueComment(owner, name, existing.id, body)
    : await client.createIssueComment(owner, name, pr.number, body);
  log.info({ comment_id: comment.id, comment_url: comment.html_url, updated: Boolean(existing) }, "PR comment posted");

  for (const result of results) {
    deps.db.recordBreakingChangeEvent({
      installationId: installation.id,
      repo,
      prNumber: pr.number,
      headSha: pr.head.sha,
      specPath: result.specPath,
      changes: result.changes,
      commentId: comment.id,
    });
  }

  return { status: "commented", breaking: total, commentId: comment.id };
}
