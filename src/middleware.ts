import { NextRequest, NextResponse } from "next/server";

/**
 * On Vercel, Next.js API route files take precedence over vercel.json rewrites.
 * Proxy /api to Railway whenever BACKEND_URL is set, or when running on Vercel.
 */
export async function middleware(request: NextRequest) {
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

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", "https");

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
    if (lower === "transfer-encoding" || lower === "content-encoding") return;
    if (lower === "set-cookie") return;
    responseHeaders.set(key, value);
  });

  const cookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  for (const cookie of cookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const config = {
  matcher: "/api/:path*",
};
