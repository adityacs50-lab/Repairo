import { NextRequest, NextResponse } from "next/server";

/**
 * Auth.js (Google waitlist) lives on Vercel. GitHub product OAuth
 * (`/api/auth/github`, exact `/api/auth/callback`, `/me`, `/logout`, `/status`)
 * still goes to Railway when BACKEND_URL is set.
 */
function isAuthJsRoute(pathname: string): boolean {
  if (pathname.startsWith("/api/auth/callback/")) return true;
  if (pathname.startsWith("/api/auth/signin")) return true;
  if (pathname.startsWith("/api/auth/signout")) return true;
  return (
    pathname === "/api/auth/session" ||
    pathname === "/api/auth/csrf" ||
    pathname === "/api/auth/providers" ||
    pathname === "/api/auth/error" ||
    pathname === "/api/auth/verify-request"
  );
}

/**
 * Proxy /api to Railway on Vercel. Explicitly forwards Cookie (fetch often strips it).
 */
export async function proxy(request: NextRequest) {
  if (isAuthJsRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const backend = (
    process.env.BACKEND_URL ||
    (process.env.VERCEL ? "https://repairo-production.up.railway.app" : "")
  )?.replace(/\/$/, "");

  if (!backend) {
    return NextResponse.next();
  }

  const target = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    backend,
  );

  const headers = new Headers();
  const pass = [
    "accept",
    "accept-language",
    "content-type",
    "authorization",
    "user-agent",
    "x-hub-signature-256",
    "x-github-event",
    "x-github-delivery",
    "stripe-signature",
  ];
  for (const key of pass) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", "https");
  headers.set(
    "x-forwarded-for",
    request.headers.get("x-forwarded-for") ?? "vercel",
  );

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target, init);

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower === "transfer-encoding" ||
      lower === "content-encoding" ||
      lower === "set-cookie"
    ) {
      return;
    }
    responseHeaders.set(key, value);
  });

  const getSetCookie = upstream.headers.getSetCookie?.bind(upstream.headers);
  const cookies = getSetCookie ? getSetCookie() : [];
  if (cookies.length) {
    for (const c of cookies) {
      responseHeaders.append("set-cookie", c);
    }
  } else {
    const single = upstream.headers.get("set-cookie");
    if (single) responseHeaders.append("set-cookie", single);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const config = {
  matcher: "/api/:path*",
};
