/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    // 레거시 URL → 신규 URL 301 영구 리다이렉트 (Phase 3에서 사이드바 링크 교체됨)
    return [
      {
        source: '/admin/analytics/segmentation',
        destination: '/admin/analytics/segments',
        permanent: true,
      },
      {
        source: '/admin/analytics/cohort',
        destination: '/admin/analytics/journey',
        permanent: true,
      },
      {
        source: '/admin/analytics/associations',
        destination: '/admin/analytics/diversity',
        permanent: true,
      },
      {
        source: '/admin/analytics/survival',
        destination: '/admin/analytics/funnel-deep',
        permanent: true,
      },
    ];
  },
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
