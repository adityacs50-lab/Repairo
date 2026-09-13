/**
 * Homepage social proof. Keep quotes attributable and metrics engine-backed.
 * Replace DESIGN_PARTNER with a named quote once you have written permission.
 */
export const DESIGN_PARTNER = {
  beforeCode:
    "We stopped finding Stripe breakage in CI. Repairo opens the PR with the call sites mapped and ",
  code: "tsc",
  afterCode: " already green — we just review and merge.",
  role: "Platform engineer",
  org: "Payments · private beta design partner",
} as const;

/** Engine facts — not production telemetry. */
export const ENGINE_METRICS = [
  { value: "6", label: "Vendor agents available" },
  { value: "10", label: "Breaking-change kinds detected" },
  { value: "113", label: "Engine tests passing" },
  { value: "0", label: "AI patches auto-merged" },
] as const;

export const VENDOR_MARKS = [
  "Stripe",
  "OpenAI",
  "Anthropic",
  "Supabase",
  "Gemini",
  "GitHub",
] as const;
