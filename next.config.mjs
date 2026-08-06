// import withPWAInit from "@ducanh2912/next-pwa";

// const withPWA = withPWAInit({
//   dest: "public",
//   cacheOnFrontEndNav: true,
//   aggressiveFrontEndNavCaching: true,
//   reloadOnOnline: true,
//   disable: process.env.NODE_ENV === "development",
//   workboxOptions: {
//     runtimeCaching: [
//       {
//         urlPattern: /^https:\/\/cdn1\.suno\.ai\/.*\.mp3$/,
//         handler: "CacheFirst",
//         options: {
//           cacheName: "joelify-suno-offline-v1",
//           expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 },
//         },
//       },
//       {
//         urlPattern: /^https:\/\/cdn2\.suno\.ai\/.*/,
//         handler: "CacheFirst",
//         options: { cacheName: "joelify-suno-art", expiration: { maxEntries: 300 } },
//       },
//     ],
//   },
// });

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig;
