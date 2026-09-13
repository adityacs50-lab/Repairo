import { App } from "@octokit/app";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface AppConfig {
  appId: number;
  privateKey: string;
  webhookSecret: string;
  port: number;
}

/** Read and validate APP_ID / PRIVATE_KEY / WEBHOOK_SECRET / PORT. */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const appId = Number(env.APP_ID);
  // Allow the PEM to be pasted as a single line with literal "\n" sequences.
  const privateKey = (env.PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  const webhookSecret = (env.WEBHOOK_SECRET ?? "").trim();

  const missing: string[] = [];
  if (!Number.isInteger(appId) || appId <= 0) missing.push("APP_ID");
  if (!privateKey) missing.push("PRIVATE_KEY");
  if (!webhookSecret) missing.push("WEBHOOK_SECRET");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return { appId, privateKey, webhookSecret, port: Number(env.PORT) || 3000 };
}

/** The @octokit/app instance: owns webhook verification + event dispatch. */
export function createGitHubApp(config: AppConfig): App {
  return new App({
    appId: config.appId,
    privateKey: config.privateKey,
    webhooks: { secret: config.webhookSecret },
  });
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Number of retries after the first attempt (default 3). */
  retries?: number;
  /** Delay before the first retry; doubles each time (default 500ms). */
  baseDelayMs?: number;
  label?: string;
}

/** Retry `fn` with exponential backoff on network errors, 5xx and 429. */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 500, label = "github api" } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      const delayMs = baseDelayMs * 2 ** attempt;
      logger.warn(
        { label, attempt: attempt + 1, retries, delay_ms: delayMs, err: describeError(error) },
        "github api call failed, retrying",
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  if (typeof status !== "number") return true; // network / unexpected failure
  return status >= 500 || status === 429;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// ---------------------------------------------------------------------------
// Installation tokens
// ---------------------------------------------------------------------------

export interface InstallationToken {
  token: string;
  /** ISO timestamp from GitHub; tokens live for one hour. */
  expiresAt: string;
}

export type InstallationAuth = (installationId: number) => Promise<InstallationToken>;

/** Builds the auth function that asks GitHub for an installation token. */
export function createInstallationAuth(config: AppConfig): InstallationAuth {
  const auth = createAppAuth({ appId: config.appId, privateKey: config.privateKey });
  return async (installationId) => {
    const result = await auth({ type: "installation", installationId });
    return { token: result.token, expiresAt: result.expiresAt };
  };
}

/**
 * In-memory cache of installation access tokens, keyed by installation id.
 * A token is reused until `refreshSkewMs` before it expires, then refreshed.
 */
export class InstallationTokenCache {
  private readonly tokens = new Map<number, { token: string; expiresAt: number }>();

  constructor(
    private readonly authenticate: InstallationAuth,
    private readonly refreshSkewMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  async getToken(installationId: number): Promise<string> {
    const cached = this.tokens.get(installationId);
    if (cached && cached.expiresAt - this.refreshSkewMs > this.now()) {
      return cached.token;
    }

    const fresh = await withRetry(() => this.authenticate(installationId), {
      label: "installation token",
    });
    this.tokens.set(installationId, { token: fresh.token, expiresAt: Date.parse(fresh.expiresAt) });
    logger.debug({ installation_id: installationId, expires_at: fresh.expiresAt }, "installation token refreshed");
    return fresh.token;
  }

  invalidate(installationId: number) {
    this.tokens.delete(installationId);
  }

  get size() {
    return this.tokens.size;
  }
}

// ---------------------------------------------------------------------------
// Narrow GitHub client used by the webhook handlers
// ---------------------------------------------------------------------------

export interface PullRequestFile {
  filename: string;
  status: string;
  previous_filename?: string;
}

export interface IssueComment {
  id: number;
  body?: string;
}

export interface CommentResult {
  id: number;
  html_url: string;
}

export interface RepoFileList {
  /** Every blob path in the tree at `ref` — callers filter to what they care about. */
  paths: string[];
  /** True when GitHub truncated the tree (very large repo) — the list is incomplete. */
  truncated: boolean;
}

export interface OpenFixPullRequestParams {
  owner: string;
  repo: string;
  /** Branch to base the new commit on, and to open the PR against — normally the source PR's own head branch. */
  baseBranch: string;
  branchName: string;
  files: { path: string; content: string }[];
  commitMessage: string;
  title: string;
  body: string;
}

export interface OpenFixPullRequestResult {
  number: number;
  html_url: string;
  /** False when a PR already existed for this branch and was reused instead of re-created. */
  created: boolean;
}

/** The handful of GitHub calls the app needs; easy to fake in tests. */
export interface GitHubClient {
  listPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<PullRequestFile[]>;
  /** Raw file content at `ref`, or `null` when the file does not exist there. */
  getFileText(owner: string, repo: string, path: string, ref: string): Promise<string | null>;
  listIssueComments(owner: string, repo: string, issueNumber: number): Promise<IssueComment[]>;
  createIssueComment(owner: string, repo: string, issueNumber: number, body: string): Promise<CommentResult>;
  updateIssueComment(owner: string, repo: string, commentId: number, body: string): Promise<CommentResult>;
  /**
   * Recursive file listing at `ref`, used to find consumer code to auto-repair.
   * Optional: a client that doesn't implement this just gets no auto-fix PRs.
   */
  listRepoFiles?(owner: string, repo: string, ref: string): Promise<RepoFileList>;
  /**
   * Commit `files` onto a new (or existing) branch off `baseBranch` and open a PR for it,
   * reusing an already-open PR for that branch instead of creating a second one.
   */
  openFixPullRequest?(params: OpenFixPullRequestParams): Promise<OpenFixPullRequestResult>;
}

/** Wrap an authenticated Octokit in the narrow client, with retries on every call. */
export function createGitHubClient(octokit: Octokit): GitHubClient {
  return {
    listPullRequestFiles: (owner, repo, pull_number) =>
      withRetry(
        () => octokit.paginate(octokit.rest.pulls.listFiles, { owner, repo, pull_number, per_page: 100 }),
        { label: "pulls.listFiles" },
      ),

    getFileText: (owner, repo, path, ref) =>
      withRetry(
        async () => {
          try {
            const { data } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path,
              ref,
              mediaType: { format: "raw" },
            });
            return typeof data === "string" ? data : null;
          } catch (error) {
            if ((error as { status?: number }).status === 404) return null;
            throw error;
          }
        },
        { label: "repos.getContent" },
      ),

    listIssueComments: (owner, repo, issue_number) =>
      withRetry(
        () => octokit.paginate(octokit.rest.issues.listComments, { owner, repo, issue_number, per_page: 100 }),
        { label: "issues.listComments" },
      ),

    createIssueComment: (owner, repo, issue_number, body) =>
      withRetry(
        async () => {
          const { data } = await octokit.rest.issues.createComment({ owner, repo, issue_number, body });
          return { id: data.id, html_url: data.html_url };
        },
        { label: "issues.createComment" },
      ),

    updateIssueComment: (owner, repo, comment_id, body) =>
      withRetry(
        async () => {
          const { data } = await octokit.rest.issues.updateComment({ owner, repo, comment_id, body });
          return { id: data.id, html_url: data.html_url };
        },
        { label: "issues.updateComment" },
      ),

    listRepoFiles: (owner, repo, ref) =>
      withRetry(
        async () => {
          const { data } = await octokit.rest.git.getTree({ owner, repo, tree_sha: ref, recursive: "true" });
          const paths = data.tree
            .filter((entry): entry is typeof entry & { path: string } => entry.type === "blob" && Boolean(entry.path))
            .map((entry) => entry.path);
          return { paths, truncated: Boolean(data.truncated) };
        },
        { label: "git.getTree" },
      ),

    openFixPullRequest: (params) =>
      withRetry(
        async () => {
          const { owner, repo, baseBranch, branchName, files, commitMessage, title, body } = params;

          const { data: baseRef } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
          const baseSha = baseRef.object.sha;
          const { data: baseCommit } = await octokit.rest.git.getCommit({ owner, repo, commit_sha: baseSha });

          const treeEntries = [];
          for (const file of files) {
            const { data: blob } = await octokit.rest.git.createBlob({
              owner,
              repo,
              content: file.content,
              encoding: "utf-8",
            });
            treeEntries.push({ path: file.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha });
          }

          const { data: tree } = await octokit.rest.git.createTree({
            owner,
            repo,
            base_tree: baseCommit.tree.sha,
            tree: treeEntries,
          });

          const { data: commit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: commitMessage,
            tree: tree.sha,
            parents: [baseSha],
          });

          // Re-running on a later `synchronize` event should update the same fix branch
          // rather than fail on "reference already exists" or pile up duplicate PRs.
          let branchExisted = false;
          try {
            await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${branchName}`, sha: commit.sha });
          } catch (error) {
            if ((error as { status?: number }).status !== 422) throw error;
            branchExisted = true;
            await octokit.rest.git.updateRef({
              owner,
              repo,
              ref: `heads/${branchName}`,
              sha: commit.sha,
              force: true,
            });
          }

          if (branchExisted) {
            const { data: existing } = await octokit.rest.pulls.list({
              owner,
              repo,
              head: `${owner}:${branchName}`,
              state: "open",
            });
            if (existing[0]) {
              return { number: existing[0].number, html_url: existing[0].html_url, created: false };
            }
          }

          const { data: pr } = await octokit.rest.pulls.create({
            owner,
            repo,
            title,
            body,
            head: branchName,
            base: baseBranch,
          });
          return { number: pr.number, html_url: pr.html_url, created: true };
        },
        { label: "openFixPullRequest" },
      ),
  };
}

/** Hands out installation-scoped clients backed by the token cache. */
export class GitHubAppClients {
  private readonly tokens: InstallationTokenCache;

  constructor(config: AppConfig) {
    this.tokens = new InstallationTokenCache(createInstallationAuth(config));
  }

  async forInstallation(installationId: number): Promise<GitHubClient> {
    const token = await this.tokens.getToken(installationId);
    return createGitHubClient(new Octokit({ auth: token, userAgent: "repairo-github-app" }));
  }

  /** Drop a cached token, e.g. when the installation is deleted. */
  forget(installationId: number) {
    this.tokens.invalidate(installationId);
  }
}
