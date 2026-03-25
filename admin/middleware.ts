import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 로그인 페이지는 통과
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // 루트 경로는 admin/dashboard로 리디렉션
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // /admin 경로는 dashboard로 리디렉션
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/admin/:path*'],
};
