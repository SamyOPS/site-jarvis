import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "dummyimage.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "www.micro-concept.fr" },
      { protocol: "https", hostname: "shadcnblocks.com" },
      { protocol: "https", hostname: "cdn-icons-png.flaticon.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "motion"],
  },
};

export default nextConfig;
