import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { jsonError, requireGithubConfig } from "@/lib/api/errors";
import { getWorkspaceForUser } from "@/lib/db/users";
import {
  assertCanCreateIntegration,
  createIntegration,
  requireWorkspaceAccess,
  serializeIntegration,
} from "@/lib/db/integrations";
import { getVendor } from "@/lib/catalog/vendors";
import { resolveVendorSpecs } from "@/lib/catalog/fetch-spec";
import {
  createRepoWebhook,
  getRecursiveTreePaths,
  getRepo,
} from "@/lib/github/client";
import { discoverFromPaths } from "@/lib/discover/repo";
import { getAppUrl } from "@/lib/auth/config";
import { writeAudit } from "@/lib/db/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Install a vendor agent: remote OpenAPI watch + consumer paths in the customer's repo.
 */
export async function POST(request: NextRequest) {
  try {
    requireGithubConfig();
    const session = await requireSession();
    const workspace = getWorkspaceForUser(session.userId);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }
    requireWorkspaceAccess(session.userId, workspace.id);
    assertCanCreateIntegration(workspace);

    const body = (await request.json()) as {
      vendorId?: string;
      owner?: string;
      repo?: string;
      consumerPaths?: string[];
      baseBranch?: string;
      registerWebhook?: boolean;
      autoDiscover?: boolean;
    };

    if (!body.vendorId || !body.owner || !body.repo) {
      return NextResponse.json(
        { error: "vendorId, owner, and repo are required" },
        { status: 400 },
      );
    }

    const vendor = getVendor(body.vendorId);
    if (!vendor) {
      return NextResponse.json({ error: "Unknown vendor" }, { status: 404 });
    }

    const repoMeta = await getRepo(
      session.accessToken,
      body.owner,
      body.repo,
    );
    const baseBranch = body.baseBranch || repoMeta.default_branch;

    let consumerPaths = (body.consumerPaths ?? [])
      .map((p) => p.trim())
      .filter(Boolean);

    const shouldDiscover = !consumerPaths.length || body.autoDiscover === true;
    if (shouldDiscover) {
      const paths = await getRecursiveTreePaths(
        session.accessToken,
        body.owner,
        body.repo,
        baseBranch,
      );
      const discovered = discoverFromPaths(paths);
      const suggested = discovered.consumers
        .filter(
          (c) =>
            c.kind === "consumer-ts" ||
            c.kind === "consumer-js" ||
            c.kind === "consumer-py",
        )
        .slice(0, 10)
        .map((c) => c.path);
      if (!consumerPaths.length) consumerPaths = suggested;
    }

    if (!consumerPaths.length) {
      return NextResponse.json(
        {
          error:
            "No consumer files found. Pass consumerPaths or add *client*.ts / sdk files to the repo.",
        },
        { status: 400 },
      );
    }

    // Seed baseline: previous pin vs live (or live vs live until next poll)
    const { before, after } = await resolveVendorSpecs({
      vendorId: vendor.id,
    });

    const integration = createIntegration({
      workspaceId: workspace.id,
      name: `${vendor.name} agent → ${body.owner}/${body.repo}`,
      owner: body.owner,
      repo: body.repo,
      beforePath: `__remote__/${vendor.id}/before`,
      afterPath: `__remote__/${vendor.id}/after`,
      beforeRef: "remote",
      afterRef: "remote",
      consumerPaths,
      consumerRef: baseBranch,
      baseBranch,
      specSource: "remote",
      vendorId: vendor.id,
      vendorSpecUrl: vendor.openapiUrl,
      // Store "before" as baseline so next run diffs live after against this snapshot
      baselineSpec: before === after ? after : before,
    });

    // If we had a previous pin different from live, keep live as the thing to catch up to:
    // baseline = before (old), first run will fetch after (live) and patch consumers.
    if (before !== after) {
      // baseline already = before; good
    } else {
      // No previous pin: baseline = current live; first run may no-op until vendor publishes
    }

    let webhookWarning: string | null = null;
    if (body.registerWebhook !== false) {
      try {
        const hookId = await createRepoWebhook({
          token: session.accessToken,
          owner: integration.owner,
          repo: integration.repo,
          hookUrl: `${getAppUrl()}/api/webhooks/github?integrationId=${integration.id}`,
          secret: integration.webhookSecret,
        });
        const { updateIntegration } = await import("@/lib/db/integrations");
        updateIntegration(integration.id, { webhookId: hookId });
        integration.webhookId = hookId;
      } catch (err) {
        webhookWarning =
          err instanceof Error
            ? `Agent installed but webhook failed: ${err.message}`
            : "Agent installed but webhook registration failed";
      }
    }

    writeAudit({
      workspaceId: workspace.id,
      userId: session.userId,
      action: "vendor.agent_installed",
      meta: { vendorId: vendor.id, repo: `${body.owner}/${body.repo}` },
    });

    return NextResponse.json({
      integration: serializeIntegration(integration),
      vendor,
      consumerPaths,
      warning: webhookWarning,
      note:
        before === after
          ? "Baseline equals live spec — first Run may no-op until the vendor OpenAPI changes. Re-run later or use Stripe (has a previous pin) for an immediate diff."
          : "Baseline seeded from a previous OpenAPI pin — Run now to open a repair PR against live.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
