/** @type {import('next').NextConfig} */

// In development the frontend (localhost:3000) and backend (127.0.0.1:8000) are
// different origins, which breaks first-party HttpOnly cookies. Proxying /api
// through Next makes the browser see one origin. Set API_PROXY_TARGET to enable.
// In production the browser talks to https://api.vivasense.tech directly and
// this proxy is not needed.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  skipTrailingSlashRedirect: true, // Preserve trailing slashes for Django API proxy
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async rewrites() {
    if (!API_PROXY_TARGET) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;