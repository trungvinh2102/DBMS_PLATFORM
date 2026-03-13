import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  typedRoutes: true,
  reactCompiler: true,
  transpilePackages: ["shiki"],
};

export default nextConfig;
