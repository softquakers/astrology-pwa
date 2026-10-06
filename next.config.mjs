const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["geo-tz"],
  env: {
    NEXT_PUBLIC_BACKEND_URL: BACKEND_URL,
    NEXT_PUBLIC_API_URL: BACKEND_URL,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
