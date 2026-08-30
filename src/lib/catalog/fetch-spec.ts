import { getVendor } from "@/lib/engine/catalog";
import { fetchSpecText } from "@/lib/engine/fetch-spec";

export async function fetchRemoteOpenApi(url: string): Promise<string> {
  return fetchSpecText(url);
}

export async function resolveVendorSpecs(options: {
  vendorId: string;
  /** Prefer stored baseline as "before" when present */
  baselineSpec?: string | null;
}) {
  const vendor = getVendor(options.vendorId);
  if (!vendor) throw new Error(`Unknown vendor: ${options.vendorId}`);
  if (!vendor.openapiUrl) {
    throw new Error(
      `${vendor.name} has no public OpenAPI spec to watch remotely. Use a manual spec (beforePath/afterPath in your own repo) instead.`,
    );
  }

  const after = await fetchSpecText(vendor.openapiUrl);
  let before = options.baselineSpec?.trim() || "";

  if (!before) {
    if (vendor.previousOpenapiUrl) {
      before = await fetchSpecText(vendor.previousOpenapiUrl);
    } else {
      // First install with no previous pin: treat current as both (empty diff until next poll)
      before = after;
    }
  }

  return { vendor, before, after };
}
