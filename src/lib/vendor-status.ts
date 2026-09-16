/**
 * Catalog pins shown on the homepage — spec versions we diff against, not live vendor uptime.
 */

export type VendorSpecStatus = {
  vendor: string;
  specPin: string;
  watch: "active" | "catalog";
  languages: string;
};

export const VENDOR_SPEC_STATUS: VendorSpecStatus[] = [
  { vendor: "Stripe", specPin: "OpenAPI pin · 2024-06-20", watch: "active", languages: "TS · Py · Go" },
  { vendor: "OpenAI", specPin: "Platform OpenAPI", watch: "active", languages: "TS · Py" },
  { vendor: "Anthropic", specPin: "Messages API spec", watch: "active", languages: "TS · Py" },
  { vendor: "Supabase", specPin: "Management API", watch: "catalog", languages: "TS" },
  { vendor: "Gemini", specPin: "Discovery API", watch: "catalog", languages: "TS · Py" },
  { vendor: "GitHub REST", specPin: "Official OpenAPI", watch: "active", languages: "TS" },
];
