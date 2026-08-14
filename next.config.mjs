import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: false,
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        // YouTube audio streams / GoogleVideo dynamic media - DO NOT CACHE
        urlPattern: /^https:\/\/(.*\.googlevideo\.com|.*\.youtube\.com\/videoplayback).*/i,
        handler: "NetworkOnly",
      },
      {
        // API responses (stale-while-revalidate)
        urlPattern: /\/api\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "api-data-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
        },
      },
      {
        // YouTube thumbnail images
        urlPattern: /^https:\/\/(i\.ytimg\.com|yt3\.ggpht\.com)\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "youtube-images-cache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/cdn1\.suno\.ai\/.*\.mp3$/,
        handler: "CacheFirst",
        options: {
          cacheName: "joelify-suno-offline-v1",
          expiration: { maxEntries: 300, maxAgeSeconds: 365 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https:\/\/cdn2\.suno\.ai\/.*/,
        handler: "CacheFirst",
        options: { cacheName: "joelify-suno-art", expiration: { maxEntries: 300 } },
      },
    ],
  },
});

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
    unoptimized: true,
  },
};

export default withPWA(nextConfig);


