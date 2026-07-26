import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/lib/db";
import { repairRuns, type Integration } from "@/lib/db/schema";
import { updateIntegration } from "@/lib/db/integrations";
import { decryptToken } from "@/lib/crypto/token";
import { getUserById } from "@/lib/db/users";
import { workspaces } from "@/lib/db/schema";
import { runRepair } from "@/lib/engine";
import {
  createPullRequestFromRepair,
  findOpenPrByHead,
  getFileContent,
  getRepo,
} from "@/lib/github/client";

export async function runIntegrationJob(options: {
  integration: Integration;
  trigger: "manual" | "webhook";
  /** Prefer the workspace owner's token */
  accessToken?: string;
}) {
  const db = getDb();
  const runId = randomUUID();
  const now = new Date();

  db.insert(repairRuns)
    .values({
      id: runId,
      integrationId: options.integration.id,
      status: "running",
      trigger: options.trigger,
      createdAt: now,
    })
    .run();

  try {
    const workspace = db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, options.integration.workspaceId))
      .get();
    if (!workspace) throw new Error("Workspace not found");

    let token = options.accessToken;
    if (!token) {
      const owner = getUserById(workspace.ownerUserId);
      if (!owner) throw new Error("Workspace owner not found");
      token = decryptToken(owner.encryptedAccessToken);
    }

    const integration = options.integration;
    const repoMeta = await getRepo(token, integration.owner, integration.repo);

    const before = await getFileContent(
      token,
      integration.owner,
      integration.repo,
      integration.beforePath,
      integration.beforeRef || repoMeta.default_branch,
    );
    const after = await getFileContent(
      token,
      integration.owner,
      integration.repo,
      integration.afterPath,
      integration.afterRef || repoMeta.default_branch,
    );

    const consumerFiles = [];
    for (const path of integration.consumerPaths) {
      const file = await getFileContent(
        token,
        integration.owner,
        integration.repo,
        path,
        integration.consumerRef || repoMeta.default_branch,
      );
      consumerFiles.push({ path: file.path, content: file.content });
    }

    const result = runRepair({
      beforeSpec: before.content,
      afterSpec: after.content,
      consumerFiles,
    });

    updateIntegration(integration.id, { lastCheckedAt: new Date() });

    if (!result.pullRequest.files.length) {
      db.update(repairRuns)
        .set({
          status: "skipped",
          summaryJson: {
            ...result.summary,
            reason: "No file changes produced",
          },
          finishedAt: new Date(),
        })
        .where(eq(repairRuns.id, runId))
        .run();
      return {
        runId,
        status: "skipped" as const,
        result,
        pr: null,
      };
    }

    const existing = await findOpenPrByHead(
      token,
      integration.owner,
      integration.repo,
      result.pullRequest.branch,
    );
    if (existing) {
      db.update(repairRuns)
        .set({
          status: "skipped",
          summaryJson: {
            ...result.summary,
            reason: "Open Repairo PR already exists",
          },
          prUrl: existing.url,
          prNumber: existing.number,
          finishedAt: new Date(),
        })
        .where(eq(repairRuns.id, runId))
        .run();
      return {
        runId,
        status: "skipped" as const,
        result,
        pr: existing,
      };
    }

    const pr = await createPullRequestFromRepair({
      token,
      owner: integration.owner,
      repo: integration.repo,
      baseBranch: integration.baseBranch || repoMeta.default_branch,
      result,
    });

    db.update(repairRuns)
      .set({
        status: "success",
        summaryJson: result.summary,
        prUrl: pr.url,
        prNumber: pr.number,
        finishedAt: new Date(),
      })
      .where(eq(repairRuns.id, runId))
      .run();

    return { runId, status: "success" as const, result, pr };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair failed";
    db.update(repairRuns)
      .set({
        status: "failed",
        error: message,
        finishedAt: new Date(),
      })
      .where(eq(repairRuns.id, runId))
      .run();
    throw error;
  }
}
