/** @type {import('next').NextConfig} */
const nextConfig = {
  // A stray lockfile in the home directory otherwise makes Next guess the wrong root.
  outputFileTracingRoot: import.meta.dirname,
  // Emits a self-contained server bundle so the container does not need node_modules.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,

  /**
   * Driver packages are optional by design — a self-hosted install should not have
   * to download the AWS SDK to run a shop. When they ARE installed, they must be
   * left as runtime requires rather than bundled.
   */
  serverExternalPackages: ['nodemailer', '@aws-sdk/client-sesv2', '@aws-sdk/client-s3'],

  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'i.etsystatic.com' }],
  },

  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },

  webpack: (config) => {
    /**
     * `optional.ts` requires by variable so webpack cannot resolve the target at
     * build time — which is exactly the point, and exactly what it warns about.
     * Scoped to that one module so genuine critical-dependency warnings elsewhere
     * still surface.
     */
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /src[\\/]lib[\\/]services[\\/]optional\.ts$/ },
    ];
    return config;
  },
};

export default nextConfig;
