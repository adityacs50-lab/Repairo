export type VendorCatalogEntry = {
  id: string;
  name: string;
  description: string;
  /** Live OpenAPI URL (after / current). May point to a Stainless .stats.yml or a Google Discovery document — fetchSpecText / parseOpenApi resolve both. */
  openapiUrl: string;
  /** Optional pinned older spec for first-run diff demos */
  previousOpenapiUrl?: string;
  homepage: string;
  tags: string[];
};

/**
 * Neutral vendor catalog — Dependabot-for-APIs style agents.
 * Specs are fetched remotely; consumers live in the customer's GitHub repo.
 * Lives in the engine so the published CLI package is self-contained;
 * the web app re-exports it from src/lib/catalog/vendors.ts.
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
      "Auto-patch Gemini AI model name updates, parameter shifts, and Google Generative AI SDK breaking changes.",
    // Google Discovery document — converted to OpenAPI by parseOpenApi.
    openapiUrl:
      "https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta",
    homepage: "https://ai.google.dev/docs",
    tags: ["ai", "google"],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description:
      "Monitor and auto-repair Messages API parameter changes and Anthropic SDK breaking updates.",
    // Stainless .stats.yml — fetchSpecText follows openapi_spec_url so the
    // pinned URL never goes stale between SDK releases.
    openapiUrl:
      "https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/.stats.yml",
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
    id: "supabase",
    name: "Supabase",
    description:
      "Track the Supabase Management API contract and repair TypeScript consumers when endpoints or fields change.",
    openapiUrl: "https://api.supabase.com/api/v1-json",
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
