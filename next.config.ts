import type { NextConfig } from "next";
const config: NextConfig = {
  agentRules: true,
  devIndicators: false,
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
};
export default config;
