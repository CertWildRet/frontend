/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // The ORE pool page used to live at /crank, then /pools - keep old links working.
      { source: "/crank", destination: "/ore", permanent: true },
      { source: "/pools", destination: "/ore", permanent: true },
      { source: "/automine", destination: "https://orestack.app/", permanent: false },
    ];
  },
};

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
