import type { App } from "@octokit/app";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import express from "express";
import { logger } from "./logger";

/**
 * Express server exposing `POST /api/github/webhooks` and `GET /healthz`.
 * Signature verification and event dispatch are delegated to @octokit/app.
 */
export function createServer(app: App): express.Express {
  const server = express();

  server.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  server.post(
    "/api/github/webhooks",
    express.raw({ type: () => true, limit: "10mb" }),
    async (req, res) => {
      const delivery = req.header("x-github-delivery") ?? "";
      const name = req.header("x-github-event");
      const signature = req.header("x-hub-signature-256") ?? "";
      const body = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

      if (!name) {
        res.status(400).json({ error: "missing x-github-event header" });
        return;
      }
      if (!signature || !(await app.webhooks.verify(body, signature))) {
        logger.warn({ delivery, event: name }, "webhook signature verification failed");
        res.status(401).json({ error: "invalid signature" });
        return;
      }

      let payload: WebhookPayload;
      try {
        payload = JSON.parse(body) as WebhookPayload;
      } catch {
        res.status(400).json({ error: "invalid JSON body" });
        return;
      }

      const log = logger.child({
        delivery,
        event: payload.action ? `${name}.${payload.action}` : name,
        repo: payload.repository?.full_name ?? null,
        pr_number: payload.pull_request?.number ?? null,
        installation_id: payload.installation?.id ?? null,
      });
      log.info("webhook received");

      try {
        await app.webhooks.receive({ id: delivery, name, payload } as EmitterWebhookEvent);
        res.json({ ok: true });
      } catch (error) {
        log.error({ err: error }, "webhook handler failed");
        res.status(500).json({ ok: false, error: "handler failed" });
      }
    },
  );

  return server;
}

/** The few top-level fields every payload may carry, used for log context. */
interface WebhookPayload {
  action?: string;
  repository?: { full_name?: string };
  pull_request?: { number?: number };
  installation?: { id?: number };
}
