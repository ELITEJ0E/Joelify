/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["youtubei.js"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "cdn1.suno.ai" },
      { protocol: "https", hostname: "cdn2.suno.ai" },
      { protocol: "https", hostname: "studio-api.suno.ai" },
      { protocol: "https", hostname: "suno.com" },
    ],
  },
};

export default nextConfig;


