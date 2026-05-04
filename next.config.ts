import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  allowedDevOrigins: ["192.168.1.72"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
};

export default nextConfig;
