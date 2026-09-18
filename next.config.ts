import type { NextConfig } from "next";

/* The app has no server side at all — pixelation, storage and export all run
 * in the browser — so it ships as a static site. That makes GitHub Pages a
 * real host rather than a workaround.
 *
 * On Pages a project site lives under /<repo>, so the build takes that prefix
 * from NEXT_PUBLIC_BASE_PATH. Left unset (local dev, Vercel, Netlify) the app
 * serves from the root exactly as before. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // Pages serves plain files: /studio has to resolve to /studio/index.html.
  trailingSlash: true,
  // No image server to optimise through.
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
