import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/** CSRF state that verifies without needing a cookie (works through API proxies). */
export function createOAuthState(secret: string) {
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", secret).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}

export function verifyOAuthState(state: string | null, secret: string) {
  if (!state) return false;
  const [nonce, sig] = state.split(".");
  if (!nonce || !sig) return false;
  const expected = createHmac("sha256", secret).update(nonce).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
