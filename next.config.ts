import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for a single-process deploy (VPS / Docker):
  //   node .next/standalone/server.js
  // Vercel has its own file-tracing pipeline — forcing "standalone" there breaks
  // the build ("next-server.js.nft.json ENOENT"), so only enable it off-Vercel.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
