/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Pool page used to live at /ore (and earlier /crank, /pools) — send old links to profile.
      { source: "/ore", destination: "/profile", permanent: true },
      { source: "/crank", destination: "/profile", permanent: true },
      { source: "/pools", destination: "/profile", permanent: true },
      { source: "/automine", destination: "https://orestack.app/", permanent: false },
    ];
  },
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
