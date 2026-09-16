/**
 * Homepage proof blocks. Metrics are engine-backed, not production telemetry.
 */

export const HOMEPAGE_PROBLEM = {
  eyebrow: "Why we built it",
  quote:
    "A breaking API change shouldn't turn into a late-night grep through the repo. Repairo shows which files are affected and prepares a patch you can review before merge.",
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
