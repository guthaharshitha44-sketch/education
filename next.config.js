/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/better-sqlite3/**/*'],
    },
  },
};

module.exports = nextConfig;
