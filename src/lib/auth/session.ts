import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getGitHubOAuthConfig } from "./config";
import { getUserById } from "@/lib/db/users";
import { decryptToken } from "@/lib/crypto/token";
import type { User } from "@/lib/db/schema";

export const SESSION_COOKIE = "repairo_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  login: string;
  avatarUrl: string;
  name?: string;
  exp: number;
};

export type SessionContext = SessionPayload & {
  user: User;
  accessToken: string;
};

function sign(payloadB64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function encodeSession(payload: SessionPayload, secret: string) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

function decodeSession(token: string, secret: string): SessionPayload | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!parsed.userId || !parsed.login || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function buildSessionValue(user: {
  userId: string;
  login: string;
  avatarUrl: string;
  name?: string;
}) {
  const config = getGitHubOAuthConfig();
  if (!config) throw new Error("GitHub OAuth is not configured");

  const payload: SessionPayload = {
    userId: user.userId,
    login: user.login,
    avatarUrl: user.avatarUrl,
    name: user.name,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  return encodeSession(payload, config.sessionSecret);
}

export async function createSession(user: {
  userId: string;
  login: string;
  avatarUrl: string;
  name?: string;
}) {
  const value = buildSessionValue(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, sessionCookieOptions());
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const config = getGitHubOAuthConfig();
  if (!config) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token, config.sessionSecret);
}

export async function getSession(): Promise<SessionContext | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const user = getUserById(payload.userId);
  if (!user) return null;
  try {
    const accessToken = decryptToken(user.encryptedAccessToken);
    return { ...payload, user, accessToken };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  return session;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function publicUser(session: SessionPayload) {
  return {
    id: session.userId,
    login: session.login,
    avatarUrl: session.avatarUrl,
    name: session.name ?? null,
  };
}
