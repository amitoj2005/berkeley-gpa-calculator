import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      canvas: './src/lib/emptyModule.ts',
    },
  },
};

export default nextConfig;
