import type { ApiChange } from "./types";
import { groupEnumChanges, type AgentEnumResolution } from "./ast-transformer";

export interface AgentResolveOptions {
  /** Explicit opt-in — this pre-pass is a no-op unless the caller set this AND
   * `ANTHROPIC_API_KEY` is present. Neither gate alone is sufficient. */
  enabled: boolean;
  /** Anthropic model id. Defaults to the current recommended default model. */
  model?: string;
  /** Minimum model-reported confidence to accept a proposal. Default 0.6. */
  minConfidence?: number;
  /** Per-call timeout in milliseconds. Default 20000. */
  timeoutMs?: number;
  /** Hard cap on the number of ambiguous cases resolved per run (i.e. the number of
   * Claude calls made). Default 20 — conservative on purpose; a real diff can have far
   * more ambiguous cases than are worth a network round-trip for (Stripe's real historical
   * diff had 1,852 changes). Cases beyond the cap are simply never attempted, so they fall
   * straight through to the existing ambiguous-flag path in ast-transformer.ts — "fail
   * closed" is free here, it's just "don't call". */
  maxAgentResolutions?: number;
}

interface RawProposal {
  target: unknown;
  confidence: unknown;
  reasoning: unknown;
}

const DEFAULT_MODEL = "claude-opus-5";
const DEFAULT_MIN_CONFIDENCE = 0.6;
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_AGENT_RESOLUTIONS = 20;

/**
 * Pure, network-free guardrail applied to every raw proposal before it's ever trusted,
 * regardless of what the model returned or claimed. Defense in depth: the strict tool
 * schema's `enum` constraint on `target` should already make an out-of-candidate value
 * impossible, but this never assumes an upstream guarantee holds.
 */
export function validateProposal(
  raw: RawProposal | null | undefined,
  candidates: string[],
  minConfidence: number = DEFAULT_MIN_CONFIDENCE,
): AgentEnumResolution | null {
  if (!raw) return null;
  if (typeof raw.target !== "string" || !candidates.includes(raw.target)) return null;
  if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence)) return null;
  if (raw.confidence < minConfidence) return null;
  if (typeof raw.reasoning !== "string" || raw.reasoning.trim().length === 0) return null;
  return { target: raw.target, confidence: raw.confidence, reasoning: raw.reasoning };
}

export interface EnumMappingContext {
  path: string;
  operation?: string;
  field: string;
  removedValue: string;
  candidates: string[];
}

/**
 * Single-shot Claude call proposing which candidate a removed enum value most likely maps
 * to. Never writes to code — the result is a plain data object the AST layer decides
 * whether to trust (see `resolvedTarget` in ast-transformer.ts). Every error path (auth,
 * rate limit, timeout, generic API error, missing/malformed response) returns `null`; this
 * function never throws, so a single flaky call degrades to "flag as ambiguous", not a
 * crashed repair run.
 */
export async function proposeEnumMapping(
  context: EnumMappingContext,
  options: AgentResolveOptions,
): Promise<AgentEnumResolution | null> {
  if (!options.enabled) return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const model = options.model ?? DEFAULT_MODEL;
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let Anthropic: any;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch (err) {
    console.warn(`[repairo] agent-resolve: @anthropic-ai/sdk not available — ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const toolName = "propose_enum_mapping";
  const client = new Anthropic({ timeout: timeoutMs });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 512,
      tools: [
        {
          name: toolName,
          description:
            "Propose which of the candidate enum values a removed API enum value most likely maps to, based on the field name, API path, and the candidate values themselves.",
          input_schema: {
            type: "object",
            properties: {
              target: {
                type: "string",
                enum: context.candidates,
                description: "The single candidate value this removed value most likely maps to.",
              },
              confidence: {
                type: "number",
                description: "Self-reported confidence in this mapping, from 0 to 1.",
              },
              reasoning: {
                type: "string",
                description: "Brief explanation for why this candidate was chosen over the others.",
              },
            },
            required: ["target", "confidence", "reasoning"],
            additionalProperties: false,
          },
          strict: true,
        },
      ],
      tool_choice: { type: "tool", name: toolName },
      messages: [
        {
          role: "user",
          content: [
            `An OpenAPI spec removed the enum value "${context.removedValue}" from the field "${context.field}"`,
            context.operation ? ` on ${context.operation.toUpperCase()} ${context.path}` : ` on ${context.path}`,
            `. The same spec change added these new candidate values for the same field: ${context.candidates.map((c) => `"${c}"`).join(", ")}.`,
            ` Which candidate does "${context.removedValue}" most likely map to?`,
          ].join(""),
        },
      ],
    });

    const toolUse = (response.content ?? []).find((block: any) => block.type === "tool_use" && block.name === toolName);
    if (!toolUse) return null;

    return validateProposal(toolUse.input as RawProposal, context.candidates, minConfidence);
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    if (status === 401 || status === 403) {
      console.warn(`[repairo] agent-resolve: Anthropic API auth error — check ANTHROPIC_API_KEY (${err?.message ?? err})`);
    } else if (status === 429) {
      console.warn(`[repairo] agent-resolve: Anthropic API rate limited — skipping this proposal (${err?.message ?? err})`);
    } else if (err?.name === "AbortError" || err?.name === "APIConnectionTimeoutError") {
      console.warn(`[repairo] agent-resolve: Anthropic API call timed out after ${timeoutMs}ms — skipping this proposal`);
    } else {
      console.warn(`[repairo] agent-resolve: Anthropic API call failed — ${err?.message ?? String(err)}`);
    }
    return null;
  }
}

/**
 * Batch pre-pass: resolves every ambiguous enum-value-removed change it can, up to
 * `maxAgentResolutions` Claude calls, and returns a plain `Map<changeId, resolution>` for
 * `applyAstTransforms`'s optional 5th parameter. Short-circuits to an empty map immediately
 * — no SDK import, no network activity at all — when the feature isn't explicitly enabled
 * or no API key is present, which is what makes the flag-off/no-key path byte-for-byte
 * identical to today's behavior.
 */
export async function resolveAmbiguousEnums(
  changes: ApiChange[],
  options: AgentResolveOptions,
): Promise<Map<string, AgentEnumResolution>> {
  const results = new Map<string, AgentEnumResolution>();
  if (!options.enabled || !process.env.ANTHROPIC_API_KEY) return results;

  const maxAgentResolutions = options.maxAgentResolutions ?? DEFAULT_MAX_AGENT_RESOLUTIONS;
  const { removedByGroup, addedByGroup } = groupEnumChanges(changes);

  let attempted = 0;
  let cappedOut = false;
  let remaining = 0;

  for (const [key, removedGroup] of removedByGroup) {
    const addedGroup = addedByGroup.get(key) ?? [];
    // Already unambiguous or nothing to map to — the deterministic path (or the
    // ambiguous-flag fallback) already handles these; the agent is only for the
    // genuinely ambiguous remainder.
    const isAmbiguous = !(removedGroup.length === 1 && addedGroup.length === 1) && addedGroup.length > 0;
    if (!isAmbiguous) continue;

    for (const change of removedGroup) {
      if (attempted >= maxAgentResolutions) {
        cappedOut = true;
        remaining++;
        continue;
      }
      attempted++;

      const candidates = addedGroup.map((c) => c.after!).filter(Boolean);
      const proposal = await proposeEnumMapping(
        {
          path: change.path,
          operation: change.operation,
          field: change.field!,
          removedValue: change.before!,
          candidates,
        },
        options,
      );
      if (proposal) results.set(change.id, proposal);
    }
  }

  if (cappedOut) {
    console.warn(
      `[repairo] agent-resolve: hit maxAgentResolutions (${maxAgentResolutions}) — ${remaining} remaining ambiguous case(s) left for manual review`,
    );
  }

  return results;
}
