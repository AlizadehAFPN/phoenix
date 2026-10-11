import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security-headers";

/**
 * `output: 'standalone'` only for the Docker target (BRIEF §3). On Vercel the
 * default output is what the platform wants, and a standalone folder would
 * also be the place Next copies env files into (next.js issue #46296), which
 * `scripts/scan-build-artifacts.mjs` refuses.
 *
 * THERE IS NO `env` KEY HERE, AND THERE NEVER WILL BE. It inlines every value
 * it names into the client bundle regardless of prefix. The pre-build guard
 * stops the build if one appears.
 */
const docker = process.env.BUILD_TARGET === "docker";
const development = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /* Next 16 writes an AGENTS.md "for AI agents" by default. This repository
     carries no such file (BRIEF §2.6). */
  agentRules: false,
  ...(docker ? { output: "standalone" as const } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
  },
  headers() {
    return Promise.resolve([
      {
        source: "/(.*)",
        headers: [...securityHeaders(development)],
      },
    ]);
  },
};

export default nextConfig;
