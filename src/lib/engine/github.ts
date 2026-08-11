import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";
import path from "path";

export interface GitRepoStatus {
  isGitRepo: boolean;
  currentBranch?: string;
  modifiedFiles?: string[];
}

export function getGitStatus(targetDir: string = "."): GitRepoStatus {
  const absPath = path.resolve(targetDir);
  try {
    const isGit = execSync("git rev-parse --is-inside-work-tree", {
      cwd: absPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim() === "true";

    if (!isGit) return { isGitRepo: false };

    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: absPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();

    const status = execSync("git status --porcelain", {
      cwd: absPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    const modifiedFiles = status
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => line.trim().split(/\s+/)[1]);

    return {
      isGitRepo: true,
      currentBranch: branch,
      modifiedFiles,
    };
  } catch {
    return { isGitRepo: false };
  }
}

export interface CreatePrOptions {
  targetDir: string;
  repoOwnerAndName?: string;
  title: string;
  body: string;
  branchName?: string;
}

export interface CreatePrResult {
  success: boolean;
  prUrl?: string;
  message: string;
}

/**
 * Handles creation of a GitHub Pull Request for validated code repairs.
 * Fails gracefully with actionable guidance if credentials or git setup are missing.
 */
export async function createGitHubPR(options: CreatePrOptions): Promise<CreatePrResult> {
  const status = getGitStatus(options.targetDir);
  if (!status.isGitRepo) {
    return {
      success: false,
      message: "Target directory is not a Git repository. Cannot create a Pull Request.",
    };
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return {
      success: false,
      message:
        "GitHub credentials are not configured.\n" +
        "No PR was created.\n\n" +
        "To enable PR creation, set environment variable GITHUB_TOKEN:\n" +
        "  export GITHUB_TOKEN=ghp_xxxx  (Linux/macOS)\n" +
        "  $env:GITHUB_TOKEN=\"ghp_xxxx\" (PowerShell)\n",
    };
  }

  const branchName = options.branchName || `repairo/repair-${Date.now().toString(36)}`;
  const absPath = path.resolve(options.targetDir);

  try {
    // 1. Create and switch to new branch
    execSync(`git checkout -b ${branchName}`, { cwd: absPath, stdio: "pipe" });

    // 2. Stage changes
    execSync("git add .", { cwd: absPath, stdio: "pipe" });

    // 3. Commit
    execSync(`git commit -m "${options.title.replace(/"/g, '\\"')}"`, { cwd: absPath, stdio: "pipe" });

    // 4. Push branch
    execSync(`git push origin ${branchName}`, { cwd: absPath, stdio: "pipe" });

    // 5. Open PR via Octokit
    let owner = "";
    let repo = "";

    if (options.repoOwnerAndName && options.repoOwnerAndName.includes("/")) {
      [owner, repo] = options.repoOwnerAndName.split("/");
    } else {
      const remoteUrl = execSync("git config --get remote.origin.url", { cwd: absPath, encoding: "utf-8" }).trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
      if (match) {
        owner = match[1];
        repo = match[2];
      }
    }

    if (!owner || !repo) {
      return {
        success: false,
        message: "Could not determine GitHub repository owner/name from git remotes or configuration.",
      };
    }

    const octokit = new Octokit({ auth: token });
    const pr = await octokit.rest.pulls.create({
      owner,
      repo,
      title: options.title,
      body: options.body,
      head: branchName,
      base: status.currentBranch || "main",
    });

    return {
      success: true,
      prUrl: pr.data.html_url,
      message: `Pull Request successfully created: ${pr.data.html_url}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Git / GitHub PR creation failed: ${err.message || String(err)}`,
    };
  }
}
