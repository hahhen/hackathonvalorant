import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/analyses/*": ["./src/data/analyses/*.json"],
  },
};

export default nextConfig;
