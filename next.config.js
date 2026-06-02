/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image payloads (base64) can be large; raise the server action / route body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

module.exports = nextConfig;
