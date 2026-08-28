export type VendorCatalogEntry = {
  id: string;
  name: string;
  description: string;
  /** Live OpenAPI URL (after / current). Absent when the vendor has no public
   * OpenAPI 3 spec to poll — those vendors require a manually-supplied spec instead. */
  openapiUrl?: string;
  /** Optional pinned older spec for first-run diff demos */
  previousOpenapiUrl?: string;
  homepage: string;
  tags: string[];
};

/**
 * Neutral vendor catalog — Dependabot-for-APIs style agents.
 * Specs are fetched remotely; consumers live in the customer's GitHub repo.
 */
export const VENDOR_CATALOG: VendorCatalogEntry[] = [
  {
    id: "openai",
    name: "OpenAI API",
    description:
      "Automated AST repairs for OpenAI SDK migrations, model deprecations (e.g. gpt-3.5-turbo -> gpt-4o-mini), and Assistants API updates.",
    openapiUrl:
      "https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml",
    homepage: "https://platform.openai.com/docs",
    tags: ["ai", "llm"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description:
      "Auto-patch Gemini AI model name updates, parameter shifts, and Google Generative AI SDK breaking changes. Google doesn't publish a public OpenAPI 3 spec for this API (only a Discovery Document, a different, incompatible format) — bring your own spec to watch it here.",
    homepage: "https://ai.google.dev/docs",
    tags: ["ai", "google"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description:
      "Monitor and auto-repair Messages API parameter changes and Anthropic SDK breaking updates.",
    // Content-addressed (Stainless-generated) spec URL, not a stable "latest" alias — it
    // will go stale whenever Anthropic regenerates their SDK. Discovered via the current
    // anthropic-sdk-typescript repo's .stats.yml; re-check that file if this 404s.
    openapiUrl:
      "https://storage.googleapis.com/stainless-sdk-openapi-specs/anthropic/anthropic-893a61e9c1cd6c69a70d1043c626ed02d12d6a492eb6ca6ef7a84c64cfb15393.yml",
    homepage: "https://docs.anthropic.com/",
    tags: ["ai", "claude"],
  },
  {
    id: "stripe",
    name: "Stripe",
    description:
      "Payments API. Watch public OpenAPI; repair TypeScript consumers when the contract or version moves.",
    openapiUrl:
      "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.yaml",
    previousOpenapiUrl:
      "https://raw.githubusercontent.com/stripe/openapi/v1220/openapi/spec3.yaml",
    homepage: "https://stripe.com/docs/api",
    tags: ["payments", "fintech"],
  },
  {
    id: "razorpay",
    name: "Razorpay",
    description:
      "Automated payment gateway contract tracking and SDK refactoring for Indian startup tech stacks. Razorpay only publishes docs and a Postman collection, no public OpenAPI 3 spec — bring your own spec to watch it here.",
    homepage: "https://razorpay.com/docs",
    tags: ["payments", "india"],
  },
  {
    id: "supabase",
    name: "Supabase",
    description:
      "Detect client query & Auth method breaking changes (@supabase/supabase-js v1 -> v2 AST refactoring).",
    openapiUrl:
      "https://raw.githubusercontent.com/supabase/supabase/master/apps/docs/spec/api_v1_openapi.json",
    homepage: "https://supabase.com/docs",
    tags: ["database", "auth"],
  },
  {
    id: "github",
    name: "GitHub REST",
    description:
      "GitHub REST OpenAPI from the official openapi repo — useful for tooling that calls api.github.com.",
    openapiUrl:
      "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.yaml",
    homepage: "https://docs.github.com/en/rest",
    tags: ["devtools"],
  },
  {
    id: "petstore",
    name: "Petstore (demo)",
    description:
      "Public Swagger Petstore OpenAPI — safe sandbox for install-agent demos without a real vendor pin.",
    openapiUrl: "https://petstore3.swagger.io/api/v3/openapi.json",
    homepage: "https://petstore3.swagger.io/",
    tags: ["demo"],
  },
];


export function getVendor(id: string) {
  return VENDOR_CATALOG.find((v) => v.id === id) ?? null;
}

export function listVendors() {
  return VENDOR_CATALOG;
}
