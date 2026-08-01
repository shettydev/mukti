/**
 * Runtime resolution of the API base URL.
 *
 * @remarks
 * `NEXT_PUBLIC_*` values are inlined by `next build`, so a published
 * (prebuilt) bundle cannot learn which port the API actually bound — port
 * fallback would leave the client calling the wrong origin. To close that,
 * the web server exposes the resolved API origin per request: `middleware.ts`
 * sets it as a plain (script-readable) cookie when the `MUKTI_API_URL`
 * environment variable is present, and the client reads it here, ahead of the
 * build-time fallback.
 *
 * A cookie is used rather than injecting a `<script>` into the document
 * because several API-calling pages are statically prerendered — their HTML
 * is fixed at build time, but middleware runs per request on every page.
 * `Set-Cookie` on the document response is stored before any subresource
 * script executes, so the value is readable synchronously at module scope.
 *
 * When `MUKTI_API_URL` is unset (hosted deployments, repo dev mode) no cookie
 * is set and resolution falls back to the build-time value, so the hosted
 * experience is byte-for-byte unchanged.
 */

/** Cookie carrying the runtime-resolved API origin. Not httpOnly: the client reads it. */
export const RUNTIME_API_URL_COOKIE = 'mukti-api-url';

/** Server-side environment variable the middleware mirrors into the cookie. */
export const RUNTIME_API_URL_ENV = 'MUKTI_API_URL';

/**
 * Reads the runtime-resolved API origin from the cookie, or `undefined` when
 * absent (or running server-side, where there is no cookie jar).
 */
export function readRuntimeApiUrl(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const prefix = `${RUNTIME_API_URL_COOKIE}=`;
  const entry = document.cookie.split('; ').find((row) => row.startsWith(prefix));
  if (!entry) {
    return undefined;
  }
  try {
    const value = decodeURIComponent(entry.slice(prefix.length));
    return value || undefined;
  } catch {
    return undefined;
  }
}
