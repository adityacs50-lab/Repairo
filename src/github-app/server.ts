import type { App } from "@octokit/app";
import express from "express";
import { handleWebhookRequest } from "./webhook-request";

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
      const body = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
      const result = await handleWebhookRequest(app, {
        delivery: req.header("x-github-delivery") ?? "",
        eventName: req.header("x-github-event") ?? null,
        signature: req.header("x-hub-signature-256") ?? "",
        body,
      });
      res.status(result.status).json(result.body);
    },
  );

  return server;
}
