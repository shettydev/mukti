/**
 * Stand-in AI CLIs for the e2e suite, first on PATH.
 *
 * @remarks
 * The API probes and prepares local CLIs by spawning them. Jest gives each test
 * file its own copy of `process.env`, but `child_process.spawn` reads the real
 * one, so PATH has to be set here, in the parent process, before any test
 * runs. With these first on PATH no real CLI is ever run and no model token is
 * spent, whatever is installed on the machine:
 *
 * - `claude`: installed and signed in.
 * - `codex`: installed; signed in while the file named by
 *   `MUKTI_E2E_CODEX_SIGNED_IN` exists; passes the adapter's settings
 *   self-check and lists one model.
 * - `agy`: not installed (every command fails, `--version` included).
 *
 * Each answers only the commands probes and preparation use; anything else,
 * including a real turn, exits non-zero.
 */
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';

export const STUB_ROOT_ENV = 'MUKTI_E2E_CLI_STUBS';
export const CODEX_SIGNED_IN_ENV = 'MUKTI_E2E_CODEX_SIGNED_IN';

export default function setup(): void {
  const root = mkdtempSync(join(tmpdir(), 'mukti-e2e-cli-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const codexSignedIn = join(root, 'codex-signed-in');
  writeFileSync(codexSignedIn, '');

  stub(bin, 'claude', [
    'case "$1 $2" in',
    '  "--version ") echo "2.1.0 (Claude Code)" ;;',
    `  "auth status") echo '{"loggedIn":true}' ;;`,
    '  *) exit 1 ;;',
    'esac',
  ]);
  stub(bin, 'codex', [
    'case "$1 $2" in',
    '  "--version ") echo "codex-cli 0.163.0" ;;',
    `  "login status") [ -f "$${CODEX_SIGNED_IN_ENV}" ] || exit 1 ;;`,
    `  "debug models") echo '{"models":[{"slug":"gpt-6.1-sol","display_name":"GPT-6.1-Sol","visibility":"list","priority":1}]}' ;;`,
    // The adapter's settings self-check: every flag accepted, file missing.
    '  "exec --json") echo "Error: failed to read model instructions file" >&2; exit 1 ;;',
    '  *) exit 1 ;;',
    'esac',
  ]);
  stub(bin, 'agy', ['exit 127']);

  process.env[STUB_ROOT_ENV] = root;
  process.env[CODEX_SIGNED_IN_ENV] = codexSignedIn;
  process.env.PATH = `${bin}${delimiter}${process.env.PATH ?? ''}`;
}

function stub(bin: string, name: string, lines: readonly string[]): void {
  const file = join(bin, name);
  writeFileSync(file, ['#!/bin/sh', ...lines, ''].join('\n'));
  chmodSync(file, 0o755);
}
