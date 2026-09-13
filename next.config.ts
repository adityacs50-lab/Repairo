import type { NextConfig } from "next";
import path from "path";

/**
 * Set on Docker builds. Vercel leaves this unset.
 *
 * There is deliberately no /api/* rewrite here any more: the app used to proxy
 * every API route to a separate Node + SQLite backend, and that backend is
 * gone. Next.js now serves its own routes. A BACKEND_URL left set in the
 * environment would silently reintroduce the proxy and 404 every API call.
 */
const useStandalone =
  process.env.OUTPUT_STANDALONE === "1" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.7", "192.168.0.6", "localhost"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  ...(useStandalone ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
