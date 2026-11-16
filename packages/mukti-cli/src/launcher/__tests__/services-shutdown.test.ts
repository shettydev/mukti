import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const hasBun = spawnSync('bun', ['--version']).status === 0;
const servicesUrl = new URL('../services.ts', import.meta.url).href;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      throw error;
    }
    return false;
  }
}

for (const runtime of ['node', 'bun']) {
  test(
    `shutdown under ${runtime} stops the service and its descendant`,
    {
      skip: process.platform === 'win32' || (runtime === 'bun' && !hasBun),
    },
    async () => {
      const dir = mkdtempSync(join(tmpdir(), 'mukti-shutdown-'));
      let leader: number | undefined;
      const descendant = 'setInterval(() => {}, 1000)';
      const serviceScript = `
      const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, ['-e', ${JSON.stringify(descendant)}], { stdio: 'ignore' });
      console.log(JSON.stringify({ leader: process.pid, descendant: child.pid }));
      setInterval(() => {}, 1000);
    `;
      const harness = join(dir, 'shutdown.ts');
      writeFileSync(
        harness,
        `
      import { startService, shutdown } from ${JSON.stringify(servicesUrl)};
      const service = startService({
        args: ['-e', ${JSON.stringify(serviceScript)}],
        command: ${JSON.stringify(process.execPath)},
        cwd: ${JSON.stringify(dir)}, env: process.env, name: 'fixture',
        readyPattern: /leader/, tint: (s) => s,
      }, ${JSON.stringify(dir)});
      service.lineListeners.push((line) => {
        process.stdout.write(line + '\\n');
        void shutdown(0);
      });
    `
      );
      try {
        const result = spawnSync(runtime === 'node' ? process.execPath : 'bun', [harness], {
          encoding: 'utf8',
          timeout: 15_000,
        });
        const ids = JSON.parse(result.stdout.trim()) as { descendant: number; leader: number };
        leader = ids.leader;
        assert.equal(result.status, 0, result.stderr);
        for (
          let attempt = 0;
          attempt < 40 && (alive(ids.leader) || alive(ids.descendant));
          attempt++
        ) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        assert.equal(alive(ids.leader), false, 'service must not survive launcher shutdown');
        assert.equal(alive(ids.descendant), false, 'descendant must not survive launcher shutdown');
      } finally {
        if (leader !== undefined) {
          try {
            process.kill(-leader, 'SIGKILL');
          } catch {
            // Already stopped by the production shutdown path.
          }
        }
        rmSync(dir, { force: true, recursive: true });
      }
    }
  );
}
