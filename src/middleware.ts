// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('mock_session');
  const path = request.nextUrl.pathname;
  const isLoginPage = path.startsWith('/login');

  // Jika belum login dan bukan di halaman login -> lempar ke login
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah login dan mencoba ke halaman login ATAU halaman root (/) -> lempar ke admin
  if (isAuthenticated && (isLoginPage || path === '/')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg).*)'],
};