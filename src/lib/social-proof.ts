/**
 * Homepage proof blocks. Metrics are engine-backed, not production telemetry.
 */

export const HOMEPAGE_PROBLEM = {
  eyebrow: "The usual week",
  quote:
    "Vendor changelog drops on Friday. Monday CI is red. Someone spends the morning finding every `max_tokens` left in the repo. We built Repairo for that afternoon.",
} as const;

/** Engine facts — not production telemetry. */
export const ENGINE_METRICS = [
  { value: "6", label: "Supported API providers" },
  { value: "10", label: "Breaking-change patterns" },
  { value: "113", label: "Engine tests (local CI)" },
  { value: "0", label: "Automatic merges" },
] as const;

export const VENDOR_MARKS = [
  "Stripe",
  "OpenAI",
  "Anthropic",
  "Supabase",
  "Gemini",
  "GitHub",
] as const;
