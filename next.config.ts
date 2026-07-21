import type { NextConfig } from "next";

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
  // Per-request security headers are applied in middleware.ts.
};

export default nextConfig;
