/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep @google/genai out of the bundler. It pulls in native Node modules, and
  // bundling them for Edge causes routes to silently fall back to the Edge runtime.
  serverExternalPackages: ['@google/genai'],
  // Image payloads (base64) can be large; raise the server action / route body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

module.exports = nextConfig;
