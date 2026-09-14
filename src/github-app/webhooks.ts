import type { App } from "@octokit/app";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import type { AppDatabase } from "../db";
import { runOasdiff, type BreakingChange, type OasdiffInput, type OasdiffResult } from "../oasdiff/oasdiff";
import {
  diffOpenApi,
  parseOpenApi,
  findImpactedCode,
  generateFixes,
  validateInMemory,
  type ApiChange,
  type ConsumerFile,
} from "../lib/engine";
import type { Logger } from "./logger";
import { logger } from "./logger";
import type { GitHubClient } from "./octokit";

// ---------------------------------------------------------------------------
// Auto-fix scan settings
// ---------------------------------------------------------------------------

/** Code file extensions the AST-repair engine can actually patch. */
const CODE_LIKE = /\.(ts|tsx|js|jsx|mts|cts|mjs|cjs|py|go)$/i;
/** Directories never worth scanning for hand-written consumer code. */
const EXCLUDED_DIR = /(^|\/)(node_modules|dist|build|out|\.next|\.git|vendor|coverage|__pycache__|\.venv|venv|site-packages)(\/|$)/i;
/** Hard cap on how many files get fetched and AST-scanned per PR, to bound API calls and time. */
const MAX_SCAN_FILES = 250;

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

export interface FixPullRequestSummary {
  number: number;
  html_url: string;
  filesChanged: number;
}

export function formatBreakingChangesComment(
  specs: SpecBreakingChanges[],
  fixPr?: FixPullRequestSummary,
): string {
  const multiSpec = specs.length > 1;
  const rows = specs.flatMap(({ specPath, changes }) =>
    changes.map((c) => {
      const details = multiSpec ? `\`${specPath}\`: ${c.details}` : c.details;
      return `| ${cell(c.rule)} | ${cell(c.endpoint)} | ${cell(details)} |`;
    }),
  );

  const fixSection = fixPr
    ? [
        "",
        "### 🔧 Automatic fix available",
        `Repairo opened #${fixPr.number} with a compile-verified patch for ${fixPr.filesChanged} consumer file(s) — [review it](${fixPr.html_url}).`,
      ]
    : [];

  return [
    COMMENT_MARKER,
    "## ⚠️ Breaking API Changes Detected",
    "",
    "| Rule | Endpoint | Details |",
    "|------|----------|---------|",
    ...rows,
    ...fixSection,
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

export type AutoFixStatus =
  | "unsupported"
  | "skipped-fork"
  | "no-changes"
  | "no-consumer-code"
  | "no-impact"
  | "needs-manual-review"
  | "typecheck-failed"
  | "no-diff"
  | "opened"
  | "error";

export interface AutoFixOutcome {
  status: AutoFixStatus;
  pr?: { number: number; html_url: string; filesChanged: number };
}

export interface PullRequestOutcome {
  status: "no-installation" | "no-spec-change" | "no-breaking" | "commented";
  breaking: number;
  commentId?: number;
  fix?: AutoFixOutcome;
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
  const specTexts: Array<{ specPath: string; before: string | null; head: string | null }> = [];
  for (const file of specFiles) {
    if (file.status === "added") continue; // nothing existed before, nothing can break

    const basePath = file.previous_filename ?? file.filename;
    const base = await client.getFileText(owner, name, basePath, pr.base.sha);
    const head = file.status === "removed" ? null : await client.getFileText(owner, name, file.filename, pr.head.sha);
    specTexts.push({ specPath: file.filename, before: base, head });

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

  let fix: AutoFixOutcome;
  try {
    fix = await attemptAutoFix(payload, client, owner, name, specTexts, log);
  } catch (error) {
    log.warn({ err: error }, "auto-fix attempt failed");
    fix = { status: "error" };
  }

  if (fix.status === "opened" && fix.pr) {
    const updatedBody = formatBreakingChangesComment(results, {
      number: fix.pr.number,
      html_url: fix.pr.html_url,
      filesChanged: fix.pr.filesChanged,
    });
    await client.updateIssueComment(owner, name, comment.id, updatedBody);
    log.info({ fix_pr: fix.pr.number, fix_pr_url: fix.pr.html_url }, "auto-fix PR opened and linked from the comment");
  }

  return { status: "commented", breaking: total, commentId: comment.id, fix };
}

// ---------------------------------------------------------------------------
// Auto-fix: run the same AST-repair engine the CLI and web app use, and open
// a PR with the result when every generated fix is deterministic and safe.
// ---------------------------------------------------------------------------

async function attemptAutoFix(
  payload: PullRequestPayload,
  client: GitHubClient,
  owner: string,
  name: string,
  specTexts: Array<{ specPath: string; before: string | null; head: string | null }>,
  log: Logger,
): Promise<AutoFixOutcome> {
  const { repository, pull_request: pr } = payload;

  // The installation only has write access to the repo it's installed on —
  // a PR from a fork has its own head repo, which we can't push a branch to.
  const headRepoFullName = (pr.head as { repo?: { full_name?: string } | null }).repo?.full_name;
  if (headRepoFullName && headRepoFullName !== repository.full_name) {
    log.debug("PR head is a fork; skipping auto-fix PR (no write access)");
    return { status: "skipped-fork" };
  }

  if (!client.listRepoFiles || !client.openFixPullRequest) {
    return { status: "unsupported" };
  }

  const changes: ApiChange[] = [];
  for (const { before, head } of specTexts) {
    if (!before || !head) continue;
    try {
      changes.push(...diffOpenApi(parseOpenApi(before), parseOpenApi(head)));
    } catch (error) {
      log.warn({ err: error }, "could not parse spec for the AST-repair pass; skipping it for auto-fix");
    }
  }
  if (changes.length === 0) return { status: "no-changes" };

  const { paths, truncated } = await client.listRepoFiles(owner, name, pr.head.sha);
  const specPaths = new Set(specTexts.map((s) => s.specPath));
  const candidatePaths = paths
    .filter((p) => CODE_LIKE.test(p) && !EXCLUDED_DIR.test(p) && !specPaths.has(p))
    .slice(0, MAX_SCAN_FILES);

  if (candidatePaths.length === 0) {
    log.debug({ truncated, scanned: paths.length }, "no scannable consumer code found in repo");
    return { status: "no-consumer-code" };
  }

  const consumerFiles: ConsumerFile[] = [];
  for (const path of candidatePaths) {
    const content = await client.getFileText(owner, name, path, pr.head.sha);
    if (content != null) consumerFiles.push({ path, content });
  }

  const impacts = findImpactedCode(changes, consumerFiles);
  if (impacts.length === 0) {
    log.info({ scanned: consumerFiles.length }, "no impacted consumer code found for this spec change");
    return { status: "no-impact" };
  }

  const { fixes, updatedFiles } = generateFixes(changes, consumerFiles, impacts);
  // Only ever push a fix branch unattended when every generated fix is deterministic
  // and safe — the same bar the CLI applies before offering auto-merge. Anything
  // ambiguous (e.g. an enum rename with more than one candidate) stays a manual
  // `repairo repair` job instead of a silent, unreviewed push.
  if (fixes.length === 0 || fixes.some((f) => !f.safe)) {
    log.info(
      { fixes: fixes.length, unsafe: fixes.filter((f) => !f.safe).length },
      "fixes need manual review; not opening an auto-fix PR",
    );
    return { status: "needs-manual-review" };
  }

  const updatedByPath = new Map(updatedFiles.map((f) => [f.path, f]));
  const mergedFiles = consumerFiles.map((f) => updatedByPath.get(f.path) ?? f);
  const typecheck = validateInMemory(mergedFiles);
  if (!typecheck.passed) {
    log.warn(
      { errors: typecheck.errors },
      "generated fixes fail an in-memory typecheck; not opening an auto-fix PR",
    );
    return { status: "typecheck-failed" };
  }

  const changedFiles = consumerFiles
    .map((f) => updatedByPath.get(f.path))
    .filter((f): f is ConsumerFile => Boolean(f))
    .filter((f) => {
      const original = consumerFiles.find((o) => o.path === f.path);
      return Boolean(original) && original!.content !== f.content;
    });
  if (changedFiles.length === 0) return { status: "no-diff" };

  const branchName = `repairo/auto-fix-pr-${pr.number}`;
  const fileList = changedFiles.map((f) => `- \`${f.path}\``).join("\n");
  const result = await client.openFixPullRequest({
    owner,
    repo: name,
    baseBranch: pr.head.ref,
    branchName,
    files: changedFiles,
    commitMessage: `fix: repair ${changedFiles.length} consumer file(s) for API contract change`,
    title: `Repairo: auto-fix for breaking API changes in #${pr.number}`,
    body: [
      `Compile-verified, deterministic fixes for the API contract change in #${pr.number}.`,
      "",
      "### Files patched",
      fileList,
      "",
      "Every change here is a deterministic transform, verified before this PR was opened " +
        "(TypeScript compile and/or Python syntax check) — no AI was involved in generating " +
        `these fixes. Merge this branch into #${pr.number} (or apply the diff directly) before that PR merges.`,
    ].join("\n"),
  });

  log.info(
    { fix_pr: result.number, fix_pr_url: result.html_url, files: changedFiles.length, reused: !result.created },
    "auto-fix PR ready",
  );
  return { status: "opened", pr: { number: result.number, html_url: result.html_url, filesChanged: changedFiles.length } };
}
