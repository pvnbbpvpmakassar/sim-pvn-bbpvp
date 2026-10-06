import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('mock_session');
  const path = request.nextUrl.pathname;
  
  const isLoginPage = path.startsWith('/login');
  const isRootPage = path === '/';
  const isAdminRoute = path.startsWith('/admin');

  // 1. Jika belum login dan mencoba akses halaman /admin -> lempar ke login
  if (!isAuthenticated && isAdminRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Jika SUDAH login dan mengakses root (/) atau (/login) -> langsung lempar ke dashboard admin
  if (isAuthenticated && (isLoginPage || isRootPage)) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Sisa request (seperti user belum login mengakses '/' atau '/login') dibiarkan lewat
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)'],
};