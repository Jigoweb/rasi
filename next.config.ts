import type { NextConfig } from "next";
import { nextRedirects } from "./src/features/public-site/wp-redirects";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return nextRedirects();
  },
};

export default nextConfig;
