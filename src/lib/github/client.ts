import type { RepairRunResult } from "@/lib/engine/types";

const API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "Repairo",
  "X-GitHub-Api-Version": "2022-11-28",
} as const;

export class GitHubError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function gh<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...HEADERS,
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) detail = body.message;
    } catch {
      /* ignore */
    }
    throw new GitHubError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  permissions?: { push?: boolean; admin?: boolean };
};

export async function listWritableRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (page <= 5) {
    const batch = await gh<GitHubRepo[]>(
      token,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );
    if (!batch.length) break;
    repos.push(
      ...batch.filter((r) => r.permissions?.push === true || r.permissions?.admin === true),
    );
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<{ path: string; content: string; sha: string }> {
  const qs = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  try {
    const data = await gh<{
      type: string;
      encoding: string;
      content: string;
      sha: string;
      path: string;
    }>(token, `/repos/${owner}/${repo}/contents/${encodedPath}${qs}`);

    if (data.type !== "file") {
      throw new GitHubError(`${path} is not a file`, 400);
    }

    const content =
      data.encoding === "base64"
        ? Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8")
        : data.content;

    return { path: data.path, content, sha: data.sha };
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) {
      throw new GitHubError(
        `File not found: ${path}${ref ? ` @ ${ref}` : ""} — this repo needs an OpenAPI file and TypeScript consumers`,
        404,
      );
    }
    throw error;
  }
}

export async function getRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubRepo> {
  return gh<GitHubRepo>(token, `/repos/${owner}/${repo}`);
}

export async function getRecursiveTreePaths(
  token: string,
  owner: string,
  repo: string,
  ref?: string,
): Promise<string[]> {
  const repoMeta = await getRepo(token, owner, repo);
  const sha = await getRefSha(
    token,
    owner,
    repo,
    ref || repoMeta.default_branch,
  );
  const tree = await gh<{
    truncated: boolean;
    tree: Array<{ path?: string; type?: string }>;
  }>(token, `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`);

  const paths = tree.tree
    .filter((n) => n.type === "blob" && n.path)
    .map((n) => n.path!)
    .slice(0, 10_000);

  return paths;
}

export async function getRefSha(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<string> {
  // Accept branch name, tag, or full refs/heads/...
  const normalized = ref.startsWith("refs/") ? ref : `heads/${ref}`;
  try {
    const data = await gh<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/ref/${normalized}`,
    );
    return data.object.sha;
  } catch {
    // Maybe it's a commit SHA already
    if (/^[0-9a-f]{7,40}$/i.test(ref)) {
      const commit = await gh<{ sha: string }>(
        token,
        `/repos/${owner}/${repo}/git/commits/${ref}`,
      );
      return commit.sha;
    }
    throw new GitHubError(`Could not resolve ref: ${ref}`, 404);
  }
}

export async function createPullRequestFromRepair(options: {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  result: RepairRunResult;
}): Promise<{ url: string; number: number; branch: string }> {
  const { token, owner, repo, baseBranch, result } = options;
  const files = result.pullRequest.files;
  if (!files.length) {
    throw new GitHubError("No file changes to commit", 400);
  }

  const baseSha = await getRefSha(token, owner, repo, baseBranch);
  const baseCommit = await gh<{ tree: { sha: string }; sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits/${baseSha}`,
  );

  const branchName = sanitizeBranch(result.pullRequest.branch);

  // Create or reset branch ref
  try {
    await gh(token, `/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    });
  } catch (err) {
    if (err instanceof GitHubError && err.status === 422) {
      await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha: baseSha, force: true }),
      });
    } else {
      throw err;
    }
  }

  const treeItems = [];
  for (const file of files) {
    const blob = await gh<{ sha: string }>(
      token,
      `/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
      },
    );
    treeItems.push({
      path: file.path.replace(/^\//, ""),
      mode: "100644" as const,
      type: "blob" as const,
      sha: blob.sha,
    });
  }

  const tree = await gh<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: treeItems,
      }),
    },
  );

  const commitMessage =
    result.pullRequest.commits[0]?.message ?? result.pullRequest.title;

  const commit = await gh<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMessage,
        tree: tree.sha,
        parents: [baseSha],
      }),
    },
  );

  await gh(token, `/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: commit.sha, force: true }),
  });

  const pr = await gh<{ html_url: string; number: number }>(
    token,
    `/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: result.pullRequest.title,
        head: branchName,
        base: baseBranch,
        body: result.pullRequest.body,
      }),
    },
  );

  return { url: pr.html_url, number: pr.number, branch: branchName };
}

function sanitizeBranch(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._\-/]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export async function findOpenPrByHead(
  token: string,
  owner: string,
  repo: string,
  headBranch: string,
): Promise<{ url: string; number: number } | null> {
  const data = await gh<
    Array<{ html_url: string; number: number; head: { ref: string } }>
  >(token, `/repos/${owner}/${repo}/pulls?state=open&per_page=50`);
  const match = data.find((pr) => pr.head.ref === headBranch);
  return match ? { url: match.html_url, number: match.number } : null;
}

export async function createRepoWebhook(options: {
  token: string;
  owner: string;
  repo: string;
  hookUrl: string;
  secret: string;
}): Promise<number> {
  const hook = await gh<{ id: number }>(
    options.token,
    `/repos/${options.owner}/${options.repo}/hooks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: options.hookUrl,
          content_type: "json",
          secret: options.secret,
          insecure_ssl: "0",
        },
      }),
    },
  );
  return hook.id;
}

export async function deleteRepoWebhook(options: {
  token: string;
  owner: string;
  repo: string;
  hookId: number;
}) {
  try {
    await gh(
      options.token,
      `/repos/${options.owner}/${options.repo}/hooks/${options.hookId}`,
      { method: "DELETE" },
    );
  } catch {
    /* ignore missing hooks */
  }
}
