import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the refresh token in cookies
  // The refresh token is httpOnly and secure, used as the primary indicator of a session
  const refreshToken = request.cookies.get('refreshToken');
  const isAuth = !!refreshToken;
  const { pathname } = request.nextUrl;

  // Define paths
  const isProtectedPath = pathname.startsWith('/dashboard');
  const isAuthPage = pathname === '/auth';

  // Scenario 1: Unauthenticated user trying to access protected routes
  if (isProtectedPath && !isAuth) {
    // Redirect to auth page
    const url = new URL('/auth', request.url);
    // Add the original path as a query parameter to redirect back after login
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Scenario 2: Authenticated user trying to access the login/signup page
  if (isAuthPage && isAuth) {
    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Scenario 3: Redirect /dashboard/conversations/new to /dashboard/conversations with dialog auto-open
  if (pathname === '/dashboard/conversations/new') {
    const url = new URL('/dashboard/conversations', request.url);
    url.searchParams.set('openDialog', 'true');
    return NextResponse.redirect(url);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
