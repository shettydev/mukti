/**
 * @jest-environment node
 */
import type { NextRequest } from 'next/server';

import { middleware } from '../middleware';

const ORIGINAL = process.env.NEXT_PUBLIC_MUKTI_LOCAL;

/**
 * Minimal NextRequest stand-in — the middleware only reads `cookies.get`,
 * `nextUrl.pathname`, and `url`. Avoids constructing a real NextRequest (which
 * needs edge globals) so the test runs under the shared jsdom environment.
 */
function redirectLocation(res: ReturnType<typeof middleware>): null | string {
  return res.headers.get('location');
}

function request(pathname: string, cookie?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) => (cookie && name === 'refreshToken' ? { value: cookie } : undefined),
    },
    nextUrl: { pathname },
    url: `http://localhost:3001${pathname}`,
  } as unknown as NextRequest;
}

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
  } else {
    process.env.NEXT_PUBLIC_MUKTI_LOCAL = ORIGINAL;
  }
});

describe('middleware — local mode', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MUKTI_LOCAL = '1';
  });

  it('allows a protected path with no session cookie (no auth gate)', () => {
    expect(redirectLocation(middleware(request('/chat')))).toBeNull();
  });

  it('does not redirect /auth into the app', () => {
    expect(redirectLocation(middleware(request('/auth')))).toBeNull();
  });

  it('keeps the legacy new-conversation redirect', () => {
    expect(redirectLocation(middleware(request('/dashboard/conversations/new')))).toContain(
      '/chat'
    );
  });
});

describe('middleware — hosted mode (flag off)', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
  });

  it('redirects a protected path to /auth when unauthenticated', () => {
    expect(redirectLocation(middleware(request('/chat')))).toContain('/auth');
  });

  it('redirects /auth into the app when a session cookie is present', () => {
    expect(redirectLocation(middleware(request('/auth', 'abc')))).toContain('/chat');
  });

  it('allows a protected path when authenticated', () => {
    expect(redirectLocation(middleware(request('/chat', 'abc')))).toBeNull();
  });
});
