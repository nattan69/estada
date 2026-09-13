/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy: les crides a /api/* del navegador es reenvien al backend FastAPI.
  // Així el frontend i el backend comparteixen el mateix domini públic (sense
  // CORS ni subdomini extra). El backend corre a localhost:8001 (mateix host WSL).
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
