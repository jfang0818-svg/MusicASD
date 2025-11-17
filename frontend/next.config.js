/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Empty turbopack config to silence webpack warning
  turbopack: {},

  // Backend API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // Python FastAPI backend (IPv4)
      },
      {
        source: '/api/mcp/:path*',
        destination: 'http://127.0.0.1:8001/:path*', // MCP server (IPv4)
      },
    ];
  },

  // CORS headers for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },

  // Image and file optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/assets/**',
      },
    ],
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/backend',
    NEXT_PUBLIC_MCP_URL: process.env.NEXT_PUBLIC_MCP_URL || 'http://localhost:3000/api/mcp',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
  },
};

module.exports = nextConfig;