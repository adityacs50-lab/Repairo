import type { App } from "@octokit/app";
import type { EmitterWebhookEvent } from "@octokit/webhooks";
import { logger } from "./logger";

export interface WebhookRequestInput {
  delivery: string;
  eventName: string | null;
  signature: string;
  body: string;
}

export type WebhookResponseBody = { ok: true } | { ok?: false; error: string };

export interface WebhookHandleResult {
  status: number;
  body: WebhookResponseBody;
}

/** The few top-level fields every payload may carry, used for log context. */
interface WebhookPayload {
  action?: string;
  repository?: { full_name?: string };
  pull_request?: { number?: number };
  installation?: { id?: number };
}

/**
 * Verify signature, parse JSON, and dispatch to @octokit/app handlers.
 * Shared by the Express server and the Next.js API route.
 */
export async function handleWebhookRequest(
  app: App,
  input: WebhookRequestInput,
): Promise<WebhookHandleResult> {
  const { delivery, eventName, signature, body } = input;

  if (!eventName) {
    return { status: 400, body: { error: "missing x-github-event header" } };
  }

  if (!signature || !(await app.webhooks.verify(body, signature))) {
    logger.warn({ delivery, event: eventName }, "webhook signature verification failed");
    return { status: 401, body: { error: "invalid signature" } };
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body) as WebhookPayload;
  } catch {
    return { status: 400, body: { error: "invalid JSON body" } };
  }

  const log = logger.child({
    delivery,
    event: payload.action ? `${eventName}.${payload.action}` : eventName,
    repo: payload.repository?.full_name ?? null,
    pr_number: payload.pull_request?.number ?? null,
    installation_id: payload.installation?.id ?? null,
  });
  log.info("webhook received");

  try {
    await app.webhooks.receive({ id: delivery, name: eventName, payload } as EmitterWebhookEvent);
    return { status: 200, body: { ok: true } };
  } catch (error) {
    log.error({ err: error }, "webhook handler failed");
    return { status: 500, body: { ok: false, error: "handler failed" } };
  }
}
