import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.125"],
  images: {
    /*
      Liste par defaut de Next, 3840 remplace par 2560. Un `sizes="100vw"` sur un ecran
      mis a l'echelle (125 / 150 %) faisait servir la variante 3840 : ~40 Mo de bitmap
      decode par photo, pour un gain invisible pendant un zoom ou un defilement. Les
      sources de la vitrine sont d'ailleurs bornees a 2560 px de large.
    */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      {
        protocol: 'https',
        hostname: 'www.micro-concept.fr',
      },
      {
        protocol: 'https',
        hostname: 'media.giphy.com',
      },
    ],
  },
};

export default nextConfig;
