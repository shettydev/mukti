import { EventEmitter } from 'events';

export type FakeChild = EventEmitter & {
  kill: jest.Mock;
  stderr: EventEmitter;
  stdin: { end: jest.Mock; on: jest.Mock; write: jest.Mock };
  stdout: EventEmitter;
};

/**
 * Builds a fake child process. `outcome` decides what happens after stdin ends:
 * - { stdout, code: 0 } → emits stdout data then closes successfully
 * - { code: n } → closes with a non-zero exit and optional stderr
 * - { errorCode } → emits an 'error' (e.g. ENOENT for a missing CLI)
 * - { hang: true } → never closes on its own; `kill()` closes it with a signal
 */
export function fakeChild(outcome: {
  code?: number;
  errorCode?: string;
  hang?: boolean;
  stderr?: string;
  stdout?: string;
}): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = jest.fn(() => {
    setImmediate(() => child.emit('close', null, 'SIGTERM'));
    return true;
  });
  child.stdin = {
    end: jest.fn(() => {
      if (outcome.hang) {
        return;
      }
      // Emit the outcome asynchronously once the input has been written.
      setImmediate(() => {
        if (outcome.errorCode) {
          const err = new Error('spawn failed') as NodeJS.ErrnoException;
          err.code = outcome.errorCode;
          child.emit('error', err);
          return;
        }
        if (outcome.stdout) {
          child.stdout.emit('data', Buffer.from(outcome.stdout));
        }
        if (outcome.stderr) {
          child.stderr.emit('data', Buffer.from(outcome.stderr));
        }
        child.emit('close', outcome.code ?? 0);
      });
    }),
    on: jest.fn(),
    write: jest.fn(),
  };
  return child;
}
