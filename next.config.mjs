/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Desabilitar Turbopack temporariamente para resolver erro de runtime
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
