import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    "/api/**": ["./data/**", "./samples/**"],
    "/*": ["./data/**", "./samples/**"],
  },
  outputFileTracingExcludes: {
    "*": ["./srdi_raw/**", "./data/cache/**"],
  },
};

export default nextConfig;
