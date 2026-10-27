import { rmSync } from 'fs';

import { STUB_ROOT_ENV } from './cli-stubs.global-setup';

/** Removes the stand-in CLIs created by `cli-stubs.global-setup.ts`. */
export default function teardown(): void {
  const root = process.env[STUB_ROOT_ENV];
  if (root) {
    rmSync(root, { force: true, recursive: true });
  }
}
