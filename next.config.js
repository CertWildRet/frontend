/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Old pool URLs — /ore and /crank redirect to profile; /pools is a live route again.
      { source: "/ore", destination: "/profile", permanent: true },
      { source: "/crank", destination: "/profile", permanent: true },
      { source: "/automine", destination: "https://orestack.app/", permanent: false },
    ];
  },
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
