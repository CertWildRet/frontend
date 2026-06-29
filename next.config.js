/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // The ORE pool page used to live at /crank, then /pools — keep old links working.
      { source: "/crank", destination: "/ore", permanent: true },
      { source: "/pools", destination: "/ore", permanent: true },
    ];
  },
};
module.exports = nextConfig;
