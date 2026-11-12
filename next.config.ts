import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build to static HTML/JS/CSS in out/, served directly by nginx
  // (no `next start`). See deploy/README.md.
  output: "export",
  // next/image optimization needs a Next.js server; disable it for static export.
  images: { unoptimized: true },
};

export default nextConfig;
