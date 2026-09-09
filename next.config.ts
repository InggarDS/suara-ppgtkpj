import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for a single-process deploy (VPS / Docker):
  //   node .next/standalone/server.js
  // (also fine on Vercel, which ignores it).
  output: "standalone",
};

export default nextConfig;
