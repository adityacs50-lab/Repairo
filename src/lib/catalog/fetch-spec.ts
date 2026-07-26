import { getVendor } from "@/lib/catalog/vendors";

const MAX_BYTES = 8_000_000;

export async function fetchRemoteOpenApi(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, application/yaml, text/yaml, text/plain, */*",
      "User-Agent": "Repairo-Catalog/1.0",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch OpenAPI (${res.status}): ${url}`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error("OpenAPI document too large (>8MB)");
  }
  return new TextDecoder("utf-8").decode(buf);
}

export async function resolveVendorSpecs(options: {
  vendorId: string;
  /** Prefer stored baseline as "before" when present */
  baselineSpec?: string | null;
}) {
  const vendor = getVendor(options.vendorId);
  if (!vendor) throw new Error(`Unknown vendor: ${options.vendorId}`);

  const after = await fetchRemoteOpenApi(vendor.openapiUrl);
  let before = options.baselineSpec?.trim() || "";

  if (!before) {
    if (vendor.previousOpenapiUrl) {
      before = await fetchRemoteOpenApi(vendor.previousOpenapiUrl);
    } else {
      // First install with no previous pin: treat current as both (empty diff until next poll)
      before = after;
    }
  }

  return { vendor, before, after };
}
