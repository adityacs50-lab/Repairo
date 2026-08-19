import type { NextConfig } from "next";
import path from "path";

/** Set on Railway/Docker builds. Vercel should leave this unset. */
const useStandalone =
  process.env.OUTPUT_STANDALONE === "1" ||
  Boolean(process.env.RAILWAY_ENVIRONMENT);

/**
 * On Vercel: set BACKEND_URL to your Railway public URL so /api/* is proxied
 * to the Node + SQLite backend. On Railway: leave BACKEND_URL empty.
 */
const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.7", "192.168.0.6", "localhost"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  ...(useStandalone ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  async rewrites() {
    if (!backendUrl) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
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
