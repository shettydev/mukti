/**
 * Guards the property that makes a single published web bundle survive API
 * port fallback: no API origin may be baked into client code in a form the
 * runtime value cannot override.
 *
 * @remarks
 * `next build` inlines `NEXT_PUBLIC_*`, so an origin string in the client
 * bundle is expected and unavoidable — `config.api.baseUrl` keeps it as the
 * last-resort fallback. What must not exist is an origin that is *reached
 * without consulting the runtime value*: a module reading
 * `process.env.NEXT_PUBLIC_API_URL` directly, or a URL hardcoded at a call
 * site. Either would keep pointing at the build-time port after the API
 * bound elsewhere, with no rebuild able to fix it on the user's machine.
 *
 * Two layers, because each catches what the other cannot:
 *
 * - The source guard runs everywhere, including without a build, and names
 *   the offending file directly.
 * - The bundle guard runs against real `next build` output and asserts the
 *   emitted result, catching anything the source scan's heuristics miss.
 */

import fs from 'node:fs';
import path from 'node:path';

import { RUNTIME_API_URL_COOKIE } from '@/lib/runtime-config';

/** The one module allowed to name an API origin or read the build-time env var. */
const RESOLVER_MODULE = 'src/lib/config.ts';

const PACKAGE_ROOT = path.resolve(__dirname, '../../..');
const SOURCE_ROOT = path.join(PACKAGE_ROOT, 'src');
const STATIC_ROOT = path.join(PACKAGE_ROOT, '.next/static');

/** Absolute `http(s)://host:port` origins — the form that breaks under port fallback. */
const PORTED_ORIGIN = /https?:\/\/[a-zA-Z0-9.-]+:\d{2,5}[^\s"'`\\]*/g;

/** Origins that address the API, as opposed to the app's own base URL. */
function apiOrigins(contents: string): string[] {
  return (contents.match(PORTED_ORIGIN) ?? []).filter((origin) => origin.includes('/api/'));
}

function collectFiles(root: string, extensions: string[]): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : collectFiles(full, extensions);
    }
    return extensions.includes(path.extname(entry.name)) ? [full] : [];
  });
}

describe('API origin is never baked in unrecoverably (source)', () => {
  const sources = collectFiles(SOURCE_ROOT, ['.ts', '.tsx']);

  it('finds source files to scan', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('reads NEXT_PUBLIC_API_URL only in the resolver', () => {
    const offenders = sources
      .filter((file) => fs.readFileSync(file, 'utf8').includes('NEXT_PUBLIC_API_URL'))
      .map((file) => path.relative(PACKAGE_ROOT, file));

    // Anything else reading it holds a value frozen at build time, with no
    // path for the runtime origin to take precedence.
    expect(offenders).toEqual([RESOLVER_MODULE]);
  });

  it('hardcodes an API origin only in the resolver', () => {
    const offenders = sources
      .filter((file) => apiOrigins(fs.readFileSync(file, 'utf8')).length > 0)
      .map((file) => path.relative(PACKAGE_ROOT, file));

    expect(offenders).toEqual([RESOLVER_MODULE]);
  });
});

// Requires a production build. The release pipeline builds before testing;
// a bare `jest` run without one skips this layer rather than passing vacuously.
const describeBuilt = fs.existsSync(STATIC_ROOT) ? describe : describe.skip;

describeBuilt('API origin is never baked in unrecoverably (built bundle)', () => {
  const chunks = collectFiles(STATIC_ROOT, ['.js']).map((file) => ({
    contents: fs.readFileSync(file, 'utf8'),
    name: path.relative(PACKAGE_ROOT, file),
  }));

  it('finds built client chunks to scan', () => {
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('ships the runtime lookup into the client bundle', () => {
    // If the cookie read were tree-shaken away, every remaining origin would
    // be a build-time constant and port fallback would silently break.
    const carriers = chunks.filter((chunk) => chunk.contents.includes(RUNTIME_API_URL_COOKIE));
    expect(carriers.length).toBeGreaterThan(0);
  });

  it('pairs every baked API origin with the runtime lookup that overrides it', () => {
    const unpaired = chunks
      .filter((chunk) => apiOrigins(chunk.contents).length > 0)
      .filter((chunk) => !chunk.contents.includes(RUNTIME_API_URL_COOKIE))
      .map((chunk) => chunk.name);

    // A chunk naming an API origin without the cookie read reached that
    // origin by some path other than `config.api.baseUrl` — the exact defect
    // that makes a published bundle unable to follow a relocated API.
    expect(unpaired).toEqual([]);
  });
});
