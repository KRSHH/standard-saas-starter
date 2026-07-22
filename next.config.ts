import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Tree-shake named imports from these libraries.
    optimizePackageImports: [
      "lucide-react",
      "react-hook-form",
      "@tanstack/react-query",
      "drizzle-orm",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
  // Path aliases (`@/`) resolve from tsconfig.json `paths` for Turbopack and webpack.
  // Per-request security headers are applied in src/proxy.ts (Next 16 middleware).
};

// Source-map upload to Sentry only runs when an auth token is present
// (real deploys). Local/CI builds without Sentry env stay untouched and quiet.
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : nextConfig;
