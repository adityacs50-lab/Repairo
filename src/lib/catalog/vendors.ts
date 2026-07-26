export type VendorCatalogEntry = {
  id: string;
  name: string;
  description: string;
  /** Live OpenAPI URL (after / current) */
  openapiUrl: string;
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
    id: "stripe",
    name: "Stripe",
    description:
      "Payments API. Watch the public OpenAPI; repair TypeScript (and URL-like) consumers when the contract moves.",
    openapiUrl:
      "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.yaml",
    previousOpenapiUrl:
      "https://raw.githubusercontent.com/stripe/openapi/v1220/openapi/spec3.yaml",
    homepage: "https://stripe.com/docs/api",
    tags: ["payments", "fintech"],
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
