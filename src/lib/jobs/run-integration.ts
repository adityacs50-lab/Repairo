import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { firstRow, getDb } from "@/lib/db";
import { repairRuns, type Integration, workspaces } from "@/lib/db/schema";
import { assertCanRunRepair, updateIntegration } from "@/lib/db/integrations";
import { recordFixes } from "@/lib/db/repair-fixes";
import { decryptToken } from "@/lib/crypto/token";
import { getUserById } from "@/lib/db/users";
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
  const workspace = await firstRow(db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, options.integration.workspaceId)));
  if (!workspace) throw new Error("Workspace not found");
  await assertCanRunRepair(workspace);

  const runId = randomUUID();
  const now = new Date();

  await db.insert(repairRuns)
    .values({
      id: runId,
      integrationId: options.integration.id,
      status: "running",
      trigger: options.trigger,
      createdAt: now,
    });

  try {
    let token = options.accessToken;
    if (!token) {
      const owner = await getUserById(workspace.ownerUserId);
      if (!owner) throw new Error("Workspace owner not found");
      token = decryptToken(owner.encryptedAccessToken);
    }

    const integration = options.integration;
    const repoMeta = await getRepo(token, integration.owner, integration.repo);

    let beforeSpec: string;
    let afterSpec: string;

    if (integration.specSource === "remote" && integration.vendorId) {
      const { resolveVendorSpecs } = await import("@/lib/catalog/fetch-spec");
      const remote = await resolveVendorSpecs({
        vendorId: integration.vendorId,
        baselineSpec: integration.baselineSpec,
      });
      beforeSpec = remote.before;
      afterSpec = remote.after;
    } else {
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
      beforeSpec = before.content;
      afterSpec = after.content;
    }

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

    const result = await runRepair({
      beforeSpec,
      afterSpec,
      consumerFiles,
    });

    // Persist every fix this run produced — including unsafe/ambiguous ones that never
    // touched a file — before any of the skip/existing-PR/success branching below, so the
    // audit trail reflects what the engine actually decided regardless of outcome.
    await recordFixes(runId, result.fixes);

    if (!result.pullRequest.files.length) {
      if (integration.specSource === "remote") {
        await updateIntegration(integration.id, {
          lastCheckedAt: new Date(),
          baselineSpec: afterSpec,
        });
      } else {
        await updateIntegration(integration.id, { lastCheckedAt: new Date() });
      }
      await db
        .update(repairRuns)
        .set({
          status: "skipped",
          summaryJson: {
            ...result.summary,
            reason:
              beforeSpec === afterSpec
                ? "Vendor OpenAPI unchanged vs baseline"
                : "No file changes produced",
            vendorId: integration.vendorId,
          },
          finishedAt: new Date(),
        })
        .where(eq(repairRuns.id, runId));
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
      await updateIntegration(integration.id, { lastCheckedAt: new Date() });
      await db.update(repairRuns)
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
        .where(eq(repairRuns.id, runId));
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

    if (integration.specSource === "remote") {
      await updateIntegration(integration.id, {
        lastCheckedAt: new Date(),
        baselineSpec: afterSpec,
      });
    } else {
      await updateIntegration(integration.id, { lastCheckedAt: new Date() });
    }

    await db
      .update(repairRuns)
      .set({
        status: "success",
        summaryJson: result.summary,
        prUrl: pr.url,
        prNumber: pr.number,
        finishedAt: new Date(),
      })
      .where(eq(repairRuns.id, runId));

    return { runId, status: "success" as const, result, pr };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repair failed";
    await db.update(repairRuns)
      .set({
        status: "failed",
        error: message,
        finishedAt: new Date(),
      })
      .where(eq(repairRuns.id, runId));
    throw error;
  }
}
