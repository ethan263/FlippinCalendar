import type { NextConfig } from "next";

/**
 * Production-oriented Next config.
 * Cloudflare sits in front of the Vercel deployment for flippincalendar.co.za
 * (DNS / WAF / CDN). Do not enable cutover until DNS + Clerk Production are ready.
 */
const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(self)",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
