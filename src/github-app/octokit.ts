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

/** The handful of GitHub calls the app needs; easy to fake in tests. */
export interface GitHubClient {
  listPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<PullRequestFile[]>;
  /** Raw file content at `ref`, or `null` when the file does not exist there. */
  getFileText(owner: string, repo: string, path: string, ref: string): Promise<string | null>;
  listIssueComments(owner: string, repo: string, issueNumber: number): Promise<IssueComment[]>;
  createIssueComment(owner: string, repo: string, issueNumber: number, body: string): Promise<CommentResult>;
  updateIssueComment(owner: string, repo: string, commentId: number, body: string): Promise<CommentResult>;
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
