/**
 * Minimal Sarvam AI chat-completions client.
 *
 * Deliberately built on `fetch` rather than an SDK: the API is OpenAI-shaped, this
 * is the only place the product calls it, and a dependency-free client keeps the
 * published CLI package unaffected.
 *
 * Docs: https://docs.sarvam.ai/api-reference/chat/chat-completions
 */

export const DEFAULT_SARVAM_BASE_URL = "https://api.sarvam.ai/v1";
export const DEFAULT_SARVAM_MODEL = "sarvam-105b";
/** Tuned for low-latency chat (Otto widget). Override with OTTO_SARVAM_MODEL. */
export const DEFAULT_OTTO_SARVAM_MODEL = "sarvam-105b-conversations";

export interface SarvamMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SarvamCompletionOptions {
  apiKey: string;
  messages: SarvamMessage[];
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** Retries on 429 / 5xx. One retry by default. */
  retries?: number;
  /**
   * Sarvam's "thinking mode". The API accepts ONLY `"low" | "medium" | "high"`
   * — it answers 400 with
   * `body.reasoning_effort : Input should be 'low', 'medium' or 'high'`
   * to anything else, so there is no way to switch thinking off.
   *
   * That matters, because thinking is what breaks this widget: the models are
   * reasoning-capable, and the thinking pass is billed against the same
   * `max_tokens` budget as the answer. Observed on `sarvam-105b` with a
   * 1200-token budget: 5460 characters of `reasoning_content`,
   * `finish_reason: "length"`, and `content: null` — the visitor sees "I
   * couldn't come up with a response to that" because generation ran out of
   * room before the answer started.
   *
   * So the two levers are: ask for the *least* thinking the API allows
   * (`"low"`, the default here), and give the budget enough headroom that the
   * answer still fits after it (see `maxTokens`).
   *
   * Pass `"default"`, `"none"` or `"off"` to omit the field entirely and take
   * the provider default — which thinks harder, not less.
   */
  reasoningEffort?: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export type SarvamErrorKind = "auth" | "rate_limit" | "timeout" | "upstream" | "empty" | "unknown";

export class SarvamError extends Error {
  readonly kind: SarvamErrorKind;
  readonly status?: number;

  constructor(kind: SarvamErrorKind, message: string, status?: number) {
    super(message);
    this.name = "SarvamError";
    this.kind = kind;
    this.status = status;
  }
}

interface SarvamChoice {
  message?: {
    role?: string;
    /** A plain string, or OpenAI-style content blocks. */
    content?: string | Array<{ type?: string; text?: string }> | null;
    reasoning_content?: string | null;
  };
  /** Some OpenAI-compatible gateways answer in `text` rather than `message`. */
  text?: string;
  finish_reason?: string;
}

interface SarvamResponseBody {
  choices?: SarvamChoice[];
  usage?: Record<string, unknown>;
  error?: { message?: string } | string;
}

/** Hard ceiling on network calls per completion, across every retry reason. */
const MAX_CALLS = 4;

/** The only values Sarvam's `reasoning_effort` accepts. */
const VALID_REASONING_EFFORTS = new Set(["low", "medium", "high"]);

/** Least thinking the API permits — see `reasoningEffort`. */
const DEFAULT_REASONING_EFFORT = "low";

/** Upper bound on the budget escalation, so a pathological model cannot bill forever. */
const MAX_TOKEN_BUDGET = 8000;

/**
 * Pull the assistant's text out of a response, tolerating the shapes an
 * OpenAI-compatible endpoint can legitimately return. Reasoning traces are
 * deliberately NOT treated as an answer — surfacing a model's thinking to a
 * visitor would leak the system prompt.
 */
function extractText(choice: SarvamChoice | undefined): string {
  const content = choice?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const joined = content
      .map((block) => (typeof block?.text === "string" ? block.text : ""))
      .join("")
      .trim();
    if (joined) return joined;
  }
  if (typeof choice?.text === "string" && choice.text.trim()) return choice.text.trim();
  return "";
}

function reasoningChars(choice: SarvamChoice | undefined): number {
  const r = choice?.message?.reasoning_content;
  return typeof r === "string" ? r.length : 0;
}

/**
 * Did this 200-with-no-content look like a budget problem rather than a model
 * that genuinely had nothing to say? Either the thinking pass produced output
 * of its own, or generation stopped because it ran out of room. Both are worth
 * one more try with a bigger budget.
 */
function looksLikeBudgetOverrun(choice: SarvamChoice | undefined): boolean {
  return reasoningChars(choice) > 0 || choice?.finish_reason === "length";
}

function describeEmpty(choice: SarvamChoice | undefined, data: SarvamResponseBody, raw: string): string {
  const thinking = reasoningChars(choice);
  const budgetHint =
    choice?.finish_reason === "length"
      ? " — the thinking pass used the whole token budget before the answer started; raise MAX_TOKENS in the chat route"
      : "";
  return (
    `Sarvam API returned no message content (finish_reason=${choice?.finish_reason ?? "none"}` +
    `, choices=${data.choices?.length ?? 0}` +
    (thinking ? `, reasoning_content=${thinking} chars` : "") +
    `${budgetHint}). Raw: ${raw.slice(0, 400)}`
  );
}

function classifyStatus(status: number): SarvamErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "upstream";
  return "unknown";
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * `undefined` means "omit the field entirely". An unset env var resolves to
 * `"low"`, not to the provider default — see `reasoningEffort` above.
 *
 * Note that `"none"` maps to *omitting* the field rather than being sent: the
 * API rejects it outright, and silently passing it through would 400 every
 * request for anyone who set `SARVAM_REASONING_EFFORT=none`.
 */
function resolveReasoningEffort(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return DEFAULT_REASONING_EFFORT;
  if (["default", "provider", "unset", "none", "off"].includes(normalized)) return undefined;
  if (VALID_REASONING_EFFORTS.has(normalized)) return normalized;
  console.warn(
    `Sarvam: ignoring SARVAM_REASONING_EFFORT="${value}" — expected low, medium or high. ` +
      `Using "${DEFAULT_REASONING_EFFORT}".`,
  );
  return DEFAULT_REASONING_EFFORT;
}

/**
 * Resolve config from env, with explicit options winning.
 *
 * Typed as a plain string map rather than `NodeJS.ProcessEnv` because that is
 * all this reads. `ProcessEnv` additionally requires `NODE_ENV`, which forced
 * callers passing a literal (the tests) into an `as NodeJS.ProcessEnv` cast
 * that `next build` rejects as an unsound conversion.
 */
export function sarvamConfigFromEnv(env: Record<string, string | undefined> = process.env) {
  return {
    apiKey: env.SARVAM_API_KEY?.trim() || "",
    model: env.SARVAM_MODEL?.trim() || env.CHAT_MODEL?.trim() || DEFAULT_SARVAM_MODEL,
    baseUrl: (env.SARVAM_BASE_URL?.trim() || DEFAULT_SARVAM_BASE_URL).replace(/\/+$/, ""),
    reasoningEffort: env.SARVAM_REASONING_EFFORT?.trim() || undefined,
  };
}

/** Otto (/api/chat) defaults to the conversations-tuned model unless overridden. */
export function ottoSarvamConfigFromEnv(env: Record<string, string | undefined> = process.env) {
  const shared = sarvamConfigFromEnv(env);
  const model =
    env.OTTO_SARVAM_MODEL?.trim() ||
    env.SARVAM_MODEL?.trim() ||
    env.CHAT_MODEL?.trim() ||
    DEFAULT_OTTO_SARVAM_MODEL;
  const reasoningEffort =
    model.includes("conversations")
      ? "none"
      : env.SARVAM_REASONING_EFFORT?.trim() || env.OTTO_SARVAM_REASONING_EFFORT?.trim() || undefined;
  return { ...shared, model, reasoningEffort };
}

interface StreamDeltaChoice {
  delta?: { content?: string | Array<{ type?: string; text?: string }> | null };
  message?: SarvamChoice["message"];
}

function extractStreamDelta(choice: StreamDeltaChoice | undefined): string {
  const delta = choice?.delta?.content ?? choice?.message?.content;
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    return delta.map((block) => (typeof block?.text === "string" ? block.text : "")).join("");
  }
  return "";
}

/**
 * Stream tokens from Sarvam SSE. Returns the full assembled text when the stream ends.
 */
export async function streamSarvamCompletion(
  options: SarvamCompletionOptions & { onToken: (chunk: string) => void },
): Promise<string> {
  const {
    apiKey,
    messages,
    model = DEFAULT_SARVAM_MODEL,
    baseUrl = DEFAULT_SARVAM_BASE_URL,
    maxTokens = 700,
    temperature = 0.2,
    timeoutMs = 45_000,
    reasoningEffort,
    fetchImpl = fetch,
    onToken,
  } = options;

  if (!apiKey) throw new SarvamError("auth", "No Sarvam API key was provided.");

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  let effort = resolveReasoningEffort(reasoningEffort);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        ...(effort !== undefined ? { reasoning_effort: effort } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      throw new SarvamError(
        classifyStatus(response.status),
        `Sarvam API returned ${response.status}${detail ? `: ${detail}` : ""}`,
        response.status,
      );
    }

    if (!response.body) {
      throw new SarvamError("empty", "Sarvam stream returned no body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload) as { choices?: StreamDeltaChoice[] };
          const piece = extractStreamDelta(parsed.choices?.[0]);
          if (piece) {
            full += piece;
            onToken(piece);
          }
        } catch {
          // ignore malformed SSE lines
        }
      }
    }

    if (!full.trim()) {
      throw new SarvamError("empty", "Sarvam stream ended without assistant content.");
    }
    return full.trim();
  } catch (error) {
    if (error instanceof SarvamError) throw error;
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new SarvamError("timeout", `Sarvam API stream timed out after ${timeoutMs}ms.`);
    }
    throw new SarvamError(
      "unknown",
      error instanceof Error ? error.message : "Unexpected error calling the Sarvam API.",
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call Sarvam's chat-completions endpoint and return the assistant text.
 * Throws `SarvamError` with a `kind` the caller can map to an HTTP status.
 *
 * Three recoveries are built in, each taken at most once, because all three
 * otherwise surface to the visitor as the same unhelpful "could you rephrase?":
 *
 *  - 400 while sending `reasoning_effort` → the endpoint does not know the
 *    field; resend the plain body rather than failing the request.
 *  - 200 with empty content after a thinking pass or a `length` stop → retry
 *    with a doubled token budget, so the answer has room after the thinking.
 *  - 429 / 5xx / timeout → the ordinary transient retry.
 */
export async function createSarvamCompletion(options: SarvamCompletionOptions): Promise<string> {
  const {
    apiKey,
    messages,
    model = DEFAULT_SARVAM_MODEL,
    baseUrl = DEFAULT_SARVAM_BASE_URL,
    maxTokens = 700,
    temperature = 0.2,
    timeoutMs = 30_000,
    retries = 1,
    reasoningEffort,
    fetchImpl = fetch,
  } = options;

  if (!apiKey) throw new SarvamError("auth", "No Sarvam API key was provided.");

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  let effort = resolveReasoningEffort(reasoningEffort);
  let budget = maxTokens;

  let transientRetries = 0;
  let droppedEffortParam = false;
  let retriedAfterEmpty = false;
  let lastError: SarvamError | null = null;

  for (let call = 0; call < MAX_CALLS; call++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          // Sarvam's native header; the Bearer form is accepted too and is sent
          // alongside so an OpenAI-compatible gateway in front of it also works.
          "api-subscription-key": apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: budget,
          stream: false,
          ...(effort !== undefined ? { reasoning_effort: effort } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 500);
        const error = new SarvamError(
          classifyStatus(response.status),
          `Sarvam API returned ${response.status}${detail ? `: ${detail}` : ""}`,
          response.status,
        );

        // A 400 while we are sending `reasoning_effort` almost always means the
        // endpoint rejects the field. Drop it and send the plain body — better
        // than failing a request over an optional parameter.
        if (response.status === 400 && effort !== undefined && !droppedEffortParam) {
          console.warn("Sarvam: endpoint rejected reasoning_effort; retrying without it.");
          droppedEffortParam = true;
          effort = undefined;
          lastError = error;
          continue;
        }

        if (isRetryable(response.status) && transientRetries < retries) {
          transientRetries++;
          lastError = error;
          await sleep(400 * transientRetries);
          continue;
        }

        throw error;
      }

      const raw = await response.text();
      let data: SarvamResponseBody;
      try {
        data = JSON.parse(raw) as SarvamResponseBody;
      } catch {
        throw new SarvamError("empty", `Sarvam API returned a non-JSON body: ${raw.slice(0, 300)}`);
      }

      const choice = data.choices?.[0];
      const text = extractText(choice);
      if (text) return text;

      // A 200 with no content is the confusing failure mode — an unbounded
      // thinking pass, a truncated answer, or a model that genuinely returned
      // nothing all land here, and all three look identical to the visitor.
      const detail = describeEmpty(choice, data, raw);
      if (!retriedAfterEmpty && looksLikeBudgetOverrun(choice) && budget < MAX_TOKEN_BUDGET) {
        retriedAfterEmpty = true;
        // Budget is the only lever here. `effort` is deliberately left alone:
        // it is either a value the endpoint accepted, or one it already
        // rejected and we dropped — re-adding either would waste the attempt.
        budget = Math.min(Math.max(budget * 2, 3000), MAX_TOKEN_BUDGET);
        console.warn(`Sarvam: ${detail}. Retrying once with max_tokens=${budget}.`);
        lastError = new SarvamError("empty", detail);
        continue;
      }

      throw new SarvamError("empty", detail);
    } catch (error) {
      if (error instanceof SarvamError) throw error;
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        const timeout = new SarvamError("timeout", `Sarvam API call timed out after ${timeoutMs}ms.`);
        if (transientRetries < retries) {
          transientRetries++;
          lastError = timeout;
          continue;
        }
        throw timeout;
      }
      throw new SarvamError(
        "unknown",
        error instanceof Error ? error.message : "Unexpected error calling the Sarvam API.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? new SarvamError("unknown", "Sarvam API call failed.");
}
