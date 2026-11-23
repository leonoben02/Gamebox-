import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.igdb.com" }],
    // covers come straight from IGDB; skipping optimisation keeps the free Vercel plan within its image quota
    unoptimized: true,
  },
};

export default nextConfig;
