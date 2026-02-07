import type { NextConfig } from "next";

const apiProxyBaseUrl = process.env.API_PROXY_BASE_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    // In split deploys (Vercel frontend + Railway backend), proxy /api/* to Railway
    // while keeping same-origin URLs in the browser (avoids CORS + cookie issues).
    if (!process.env.VERCEL || !apiProxyBaseUrl) return {};

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiProxyBaseUrl}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
