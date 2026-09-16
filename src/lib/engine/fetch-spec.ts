import { isIP } from "net";
import { promises as dns } from "dns";

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

export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (v === "::1" || v === "0.0.0.0") return true;
  if (v.startsWith("127.") || v.startsWith("10.") || v.startsWith("169.254.") || v.startsWith("192.168.")) {
    return true;
  }
  const m = v.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80:")) return true;
  return false;
}

export function isBlockedSpecHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  return isIP(host) !== 0 && isPrivateIp(host);
}

export async function assertSafeSpecUrl(urlString: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid spec URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("Spec URL must be https");
  }
  if (isBlockedSpecHost(url.hostname)) {
    throw new Error("Spec URL host is not allowed");
  }
  if (isIP(url.hostname) === 0) {
    const records = await dns.lookup(url.hostname, { all: true });
    if (records.some((r) => isPrivateIp(r.address))) {
      throw new Error("Spec URL resolves to a private address");
    }
  }
  return url;
}

export async function fetchSpecText(url: string, depth = 0): Promise<string> {
  if (depth > 2) {
    throw new Error(`Spec URL indirection too deep: ${url}`);
  }
  const safe = await assertSafeSpecUrl(url);
  const res = await fetch(safe.toString(), {
    headers: {
      Accept: "application/json, application/yaml, text/yaml, text/plain, */*",
      "User-Agent": "Repairo/1.0",
    },
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location");
    if (!location) throw new Error(`Failed to fetch spec (${res.status}): ${url}`);
    return fetchSpecText(new URL(location, safe).toString(), depth + 1);
  }
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
