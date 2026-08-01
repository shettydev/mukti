import { config } from '@/lib/config';
import { readRuntimeApiUrl, RUNTIME_API_URL_COOKIE } from '@/lib/runtime-config';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_URL;

function clearCookie(): void {
  document.cookie = `${RUNTIME_API_URL_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function setCookie(value: string): void {
  document.cookie = `${RUNTIME_API_URL_COOKIE}=${value}`;
}

afterEach(() => {
  clearCookie();
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL_ENV;
  }
});

describe('readRuntimeApiUrl', () => {
  it('returns undefined when the cookie is absent', () => {
    expect(readRuntimeApiUrl()).toBeUndefined();
  });

  it('reads and decodes the cookie value', () => {
    setCookie(encodeURIComponent('http://localhost:4100/api/v1'));
    expect(readRuntimeApiUrl()).toBe('http://localhost:4100/api/v1');
  });

  it('reads an unencoded value as-is', () => {
    setCookie('http://localhost:4100/api/v1');
    expect(readRuntimeApiUrl()).toBe('http://localhost:4100/api/v1');
  });

  it('returns undefined for an empty value', () => {
    setCookie('');
    expect(readRuntimeApiUrl()).toBeUndefined();
  });

  it('returns undefined for a malformed encoding', () => {
    setCookie('%E0%A4%A');
    expect(readRuntimeApiUrl()).toBeUndefined();
  });

  it('picks the runtime cookie out among others', () => {
    document.cookie = 'unrelated=1';
    setCookie(encodeURIComponent('http://localhost:4100/api/v1'));
    expect(readRuntimeApiUrl()).toBe('http://localhost:4100/api/v1');
  });
});

describe('config.api.baseUrl runtime resolution', () => {
  it('falls back to the local default when nothing is configured', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(config.api.baseUrl).toBe('http://localhost:3000/api/v1');
  });

  it('uses the build-time NEXT_PUBLIC_API_URL when no runtime value exists', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.mukti.chat/api/v1';
    expect(config.api.baseUrl).toBe('https://api.mukti.chat/api/v1');
  });

  it('lets the runtime value win over the build-time one', () => {
    // Simulates the published bundle: a hardcoded origin is baked in at build
    // time, then the API binds a different port at run time. The baked value
    // must not win — this is what keeps a single build correct under port
    // fallback.
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
    setCookie(encodeURIComponent('http://localhost:4100/api/v1'));

    expect(config.api.baseUrl).toBe('http://localhost:4100/api/v1');
  });
});
