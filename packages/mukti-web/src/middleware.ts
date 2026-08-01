import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import { isLocalMode } from './lib/config';
import { RUNTIME_API_URL_COOKIE, RUNTIME_API_URL_ENV } from './lib/runtime-config';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local mode: the API runs with a bypassed auth guard and a seeded user, so
  // there is no login and no session cookie. Skip the auth gate entirely and
  // keep only the (auth-unrelated) legacy redirect.
  if (isLocalMode()) {
    if (pathname === '/dashboard/conversations/new') {
      return withRuntimeApiUrl(request, NextResponse.redirect(new URL('/chat', request.url)));
    }
    return withRuntimeApiUrl(request, NextResponse.next());
  }

  // Check for the refresh token in cookies
  // The refresh token is httpOnly and secure, used as the primary indicator of a session
  const refreshToken = request.cookies.get('refreshToken');
  const isAuth = !!refreshToken;

  // Define paths
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/canvas') ||
    pathname.startsWith('/maps') ||
    pathname.startsWith('/settings');
  const isAuthPage = pathname === '/auth';

  // Scenario 1: Unauthenticated user trying to access protected routes
  if (isProtectedPath && !isAuth) {
    // Redirect to auth page
    const url = new URL('/auth', request.url);
    // Add the original path as a query parameter to redirect back after login
    url.searchParams.set('from', pathname);
    return withRuntimeApiUrl(request, NextResponse.redirect(url));
  }

  // Scenario 2: Authenticated user trying to access the login/signup page
  if (isAuthPage && isAuth) {
    // Redirect to chat
    return withRuntimeApiUrl(request, NextResponse.redirect(new URL('/chat', request.url)));
  }

  // Scenario 3: Redirect the legacy create conversation route to the chat entry point
  if (pathname === '/dashboard/conversations/new') {
    return withRuntimeApiUrl(request, NextResponse.redirect(new URL('/chat', request.url)));
  }

  // Allow the request to proceed
  return withRuntimeApiUrl(request, NextResponse.next());
}

/**
 * Mirrors the runtime API origin (when the server was started with one) into
 * a script-readable cookie, so the client resolves `config.api.baseUrl` per
 * deployment rather than per build. Only sets the cookie when it is missing
 * or stale, and never when the variable is unset — hosted responses are
 * unchanged.
 */
function withRuntimeApiUrl(request: NextRequest, response: NextResponse): NextResponse {
  const apiUrl = process.env[RUNTIME_API_URL_ENV];
  if (!apiUrl) {
    return response;
  }
  // Stored values are URL-encoded on write; decode before comparing.
  const current = request.cookies.get(RUNTIME_API_URL_COOKIE)?.value;
  let decoded: string | undefined;
  try {
    decoded = current === undefined ? undefined : decodeURIComponent(current);
  } catch {
    decoded = current;
  }
  if (decoded === apiUrl) {
    return response;
  }
  // Session cookie: lives only for the browser session, scoped to this origin.
  response.cookies.set(RUNTIME_API_URL_COOKIE, apiUrl, {
    path: '/',
    sameSite: 'lax',
  });
  return response;
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
