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
   * closed" is free here, it's just "don't call". Malformed values (NaN, Infinity,
   * negative, non-integer, missing) are never trusted as-is — see
   * `normalizeMaxAgentResolutions`, which is the only thing that reads this field. */
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
 * Normalizes a user-supplied `maxAgentResolutions` value against a simple, conservative
 * policy, so malformed input can never disable or invert the cap:
 *
 * - missing / `undefined`              -> default (20)
 * - NaN, +/-Infinity                   -> default (never trusted — a NaN cap would make
 *                                          every `attempted >= cap` comparison false,
 *                                          silently disabling the cap entirely)
 * - negative (e.g. -1)                 -> default (a negative count isn't meaningful)
 * - non-integer (e.g. 2.5)             -> default (a fractional call count isn't meaningful)
 * - 0                                  -> 0, honored as-is (an explicit, intentional
 *                                          "resolve nothing" — the agent stays wired up
 *                                          but zero calls are ever attempted)
 * - any other non-negative integer     -> honored as-is, however large (an explicit,
 *                                          informed user choice, not malformed input)
 *
 * Called both defensively here (in `resolveAmbiguousEnums`) and at the CLI parsing
 * boundary (`src/cli/index.ts`) — the same policy in one place, so the two boundaries
 * can never drift out of sync with each other.
 */
export function normalizeMaxAgentResolutions(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_AGENT_RESOLUTIONS;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    return DEFAULT_MAX_AGENT_RESOLUTIONS;
  }
  return value;
}

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
  // Confidence is model-self-reported, NOT a calibrated probability (see the
  // `agentConfidence` doc-comment in types.ts) — but it must still look like a real
  // probability value to be usable at all: finite, and bounded to [minConfidence, 1].
  if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence)) return null;
  if (raw.confidence < minConfidence || raw.confidence > 1) return null;
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

  // Defense in depth: never trust options.maxAgentResolutions as-is. A malformed value
  // (NaN from a bad CLI flag, Infinity, a negative or fractional number) must never reach
  // the `attempted >= maxAgentResolutions` comparison below — a NaN cap in particular would
  // make that comparison false forever, silently disabling the cap entirely.
  const maxAgentResolutions = normalizeMaxAgentResolutions(options.maxAgentResolutions);
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

    // Collect this group's proposals separately before committing any of them to
    // `results`, so a conflict discovered anywhere in the group can still discard the
    // whole group's proposals, not just the specific pair that collided.
    const groupProposals = new Map<string, AgentEnumResolution>();

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
      if (proposal) groupProposals.set(change.id, proposal);
    }

    // Fail closed on the whole group if two or more independently-made model calls
    // converged on the same target. Neither call knows what the other decided, so a
    // collision here is a genuine signal the mapping is unresolvable, not evidence that
    // one of the two is correct — never guess which one to keep, and never prefer the
    // higher-confidence one (confidence is model-self-reported, not calibrated).
    const targetCounts = new Map<string, number>();
    for (const proposal of groupProposals.values()) {
      targetCounts.set(proposal.target, (targetCounts.get(proposal.target) ?? 0) + 1);
    }
    const hasConflict = Array.from(targetCounts.values()).some((count) => count > 1);

    if (hasConflict) {
      console.warn(
        `[repairo] agent-resolve: conflicting proposals for ambiguous group "${key}" — two or more removed values independently mapped to the same target. Discarding all agent resolutions for this group; falling back to manual review.`,
      );
      continue;
    }

    for (const [changeId, proposal] of groupProposals) {
      results.set(changeId, proposal);
    }
  }

  if (cappedOut) {
    console.warn(
      `[repairo] agent-resolve: hit maxAgentResolutions (${maxAgentResolutions}) — ${remaining} remaining ambiguous case(s) left for manual review`,
    );
  }

  return results;
}
