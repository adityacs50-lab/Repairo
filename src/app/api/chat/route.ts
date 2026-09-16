import { NextResponse } from "next/server";
import { buildOttoSystemPrompt } from "@/lib/otto/prompt";
import {
  createSarvamCompletion,
  ottoSarvamConfigFromEnv,
  SarvamError,
  streamSarvamCompletion,
  type SarvamMessage,
} from "@/lib/otto/sarvam";

/**
 * Otto — the Repairo chat assistant, backed by Sarvam AI.
 *
 * The product knowledge Otto is allowed to assert lives in src/lib/otto/knowledge.ts
 * and is retrieved per question; the persona and guardrails live in
 * src/lib/otto/prompt.ts. This handler is only transport: validate, call, map errors.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Widget answers stay short; conversations model is faster than full 105b reasoning. */
const MAX_TOKENS = 1400;
const TIMEOUT_MS = 45_000;
/** Bounds how much conversation history (and therefore cost) one request can carry. */
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function sanitizeHistory(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input)) return null;
  const trimmed = input.slice(-MAX_HISTORY_MESSAGES);
  const messages: ChatMessage[] = [];
  for (const entry of trimmed) {
    if (
      !entry ||
      typeof entry !== "object" ||
      (entry.role !== "user" && entry.role !== "assistant") ||
      typeof entry.content !== "string" ||
      !entry.content.trim()
    ) {
      continue;
    }
    messages.push({ role: entry.role, content: entry.content.slice(0, MAX_MESSAGE_CHARS) });
  }
  return messages.length > 0 ? messages : null;
}

function mapSarvamError(error: SarvamError) {
  switch (error.kind) {
    case "auth":
      console.error("Chat: Sarvam auth error — check SARVAM_API_KEY:", error.message);
      return NextResponse.json(
        { error: "The chat assistant isn't configured correctly on the server." },
        { status: 503 },
      );
    case "rate_limit":
      console.error("Chat: Sarvam rate limited:", error.message);
      return NextResponse.json(
        { error: "Otto is getting a lot of questions right now — please try again in a moment." },
        { status: 429 },
      );
    case "timeout":
      console.error("Chat:", error.message);
      return NextResponse.json({ error: "That took too long to answer — please try again." }, { status: 504 });
    case "upstream":
      console.error("Chat: Sarvam upstream error:", error.message);
      return NextResponse.json({ error: "The chat assistant is temporarily unavailable." }, { status: 503 });
    case "empty":
      console.error("Chat:", error.message);
      return NextResponse.json({ message: "I couldn't come up with a response to that — could you rephrase?" });
    default:
      console.error("Chat: Sarvam call failed:", error.message);
      return NextResponse.json({ error: "The chat assistant is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = sanitizeHistory(body?.messages);
    if (!messages) {
      return NextResponse.json({ error: "A non-empty message history is required." }, { status: 400 });
    }

    const wantStream = body?.stream !== false;

    const { apiKey, model, baseUrl, reasoningEffort } = ottoSarvamConfigFromEnv();
    if (!apiKey) {
      return NextResponse.json(
        { error: "The chat assistant isn't configured on the server (missing SARVAM_API_KEY)." },
        { status: 503 },
      );
    }

    const payload: SarvamMessage[] = [
      { role: "system", content: buildOttoSystemPrompt(messages, true) },
      ...messages,
    ];

    const completionOpts = {
      apiKey,
      model,
      baseUrl,
      messages: payload,
      maxTokens: MAX_TOKENS,
      temperature: 0.2,
      timeoutMs: TIMEOUT_MS,
      reasoningEffort,
    };

    if (!wantStream) {
      const text = await createSarvamCompletion(completionOpts);
      return NextResponse.json({ message: text });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const full = await streamSarvamCompletion({
            ...completionOpts,
            onToken: (chunk) => {
              controller.enqueue(encoder.encode(`${JSON.stringify({ delta: chunk })}\n`));
            },
          });
          controller.enqueue(encoder.encode(`${JSON.stringify({ done: true, message: full })}\n`));
        } catch (error) {
          try {
            const full = await createSarvamCompletion(completionOpts);
            controller.enqueue(encoder.encode(`${JSON.stringify({ delta: full })}\n`));
            controller.enqueue(encoder.encode(`${JSON.stringify({ done: true, message: full })}\n`));
          } catch (fallbackError) {
            const payload =
              fallbackError instanceof SarvamError
                ? { error: fallbackError.message, kind: fallbackError.kind }
                : { error: fallbackError instanceof Error ? fallbackError.message : "Stream failed" };
            controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SarvamError) {
      return mapSarvamError(error);
    }

    console.error("Error in chat handler:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
