/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // BACKEND_URL은 Vercel 서버 전용 환경변수 (NEXT_PUBLIC_ 없이)
    // 로컬 개발 시: .env.local에 BACKEND_URL=http://localhost:8080
    // Vercel 배포 시: Vercel Dashboard에서 BACKEND_URL=http://<EC2 IP> 설정
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/health',
        destination: `${backendUrl}/api/health`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backendUrl}/api/admin/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
