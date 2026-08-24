const MAX_BYTES = 16_000_000;

/**
 * Stainless-generated SDK repos pin their OpenAPI spec via a .stats.yml file
 * containing an `openapi_spec_url` (content-hashed, changes every release).
 * Detecting the indirection at fetch time keeps catalog URLs stable.
 */
export function resolveSpecIndirection(content: string): string | null {
  if (content.includes("\nopenapi:") || content.trimStart().startsWith("{")) {
    return null;
  }
  const match = content.match(/^openapi_spec_url:\s*(\S+)\s*$/m);
  return match ? match[1] : null;
}

export async function fetchSpecText(url: string, depth = 0): Promise<string> {
  if (depth > 2) {
    throw new Error(`Spec URL indirection too deep: ${url}`);
  }
  const res = await fetch(url, {
    headers: {
      Accept: "application/json, application/yaml, text/yaml, text/plain, */*",
      "User-Agent": "Repairo/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch spec (${res.status}): ${url}`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    throw new Error(`Spec document too large (>${MAX_BYTES / 1_000_000}MB): ${url}`);
  }
  const text = new TextDecoder("utf-8").decode(buf);

  const indirectUrl = resolveSpecIndirection(text);
  if (indirectUrl) {
    return fetchSpecText(indirectUrl, depth + 1);
  }
  return text;
}
