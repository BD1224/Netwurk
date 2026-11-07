// Next.js settings (build/runtime options). Mostly defaults for this project.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old URLs from before the routes were renamed.
  async redirects() {
    return [
      { source: "/search", destination: "/discover", permanent: false },
      { source: "/login", destination: "/signin", permanent: false },
    ];
  },
};

export default nextConfig;
