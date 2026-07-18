import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home directory otherwise makes Next guess the wrong root.
  outputFileTracingRoot: import.meta.dirname,
  // Emits a self-contained server bundle so the host does not need node_modules.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  /**
   * Driver packages are optional by design: a self-hosted install should not
   * have to download the AWS SDK to run a shop. When they ARE installed they
   * must stay runtime requires rather than being bundled, which also keeps
   * Turbopack from trying to resolve them at build time.
   */
  serverExternalPackages: [
    "nodemailer",
    "@aws-sdk/client-sesv2",
    "@aws-sdk/client-s3",
    "@aws-sdk/client-bedrock-runtime",
    "bullmq",
    "ioredis",
  ],

  // Trust-Agent parity: single-process page generation. Also the cure for
  // "Call retries were exceeded" WorkerError builds on this machine.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.etsystatic.com" },
      // Original product photo sets from the legacy WooCommerce shop; the
      // image-ownership migration (M6.3) moves these into our own storage.
      { protocol: "https", hostname: "gemysticgems.com" },
    ],
  },

  // `eslint` config key removed: the option moved to the separate next-lint
  // CLI in v16. Linting runs via `npm run lint`.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
