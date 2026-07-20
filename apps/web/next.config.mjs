/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  eslint: {
    // Don't block production builds on pre-existing lint policy during perf ship
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [{ key: "X-DNS-Prefetch-Control", value: "on" }],
    },
  ],
};

export default nextConfig;
