import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Receipt/logo/part image uploads pass through Server Actions as FormData.
      // The action validates each file at 5 MB, so allow a bit more for FormData overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
