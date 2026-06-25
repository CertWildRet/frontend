/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // The Pools page used to live at /crank — keep old links working.
      { source: "/crank", destination: "/pools", permanent: true },
    ];
  },
};
module.exports = nextConfig;
