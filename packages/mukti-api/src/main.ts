/**
 * Process entrypoint for the API (`node dist/main`, `nest start`).
 *
 * The application itself is configured and started by `startApi()` in
 * `start.ts`, which the published CLI imports directly. This file exists only
 * to run it as a standalone process.
 */
import { startApi } from './start';

void startApi();
