import type { NextConfig } from "next";
const apiOrigin =
  process.env.API_INTERNAL_URL ||
  process.env.API_URL ||
  "http://localhost:4000";
const config: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/uploads/:path*", destination: `${apiOrigin}/uploads/:path*` },
    ];
  },
};
export default config;
