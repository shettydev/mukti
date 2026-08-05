/**
 * Port probing and selection, shared by both launcher modes.
 *
 * @remarks
 * Repo mode refuses to start when its fixed ports are taken — a contributor
 * wants to know what is already running. The published CLI instead falls
 * forward to the next free port, because "port 3000 is busy" is a routine
 * state on a machine someone is only trying Mukti out on. Both behaviours are
 * built from the same probes here.
 */
import { createConnection, createServer } from 'node:net';

/**
 * The first free port at or after `preferred`, skipping any in `taken` so two
 * services chosen in the same pass cannot land on the same number.
 *
 * @returns the chosen port, or `undefined` if the whole window is occupied —
 *   the caller decides whether that is a failure or a fallback.
 */
export async function findFreePort(
  preferred: number,
  options: { readonly taken?: readonly number[]; readonly window?: number } = {}
): Promise<number | undefined> {
  const { taken = [], window = 20 } = options;
  for (let port = preferred; port < preferred + window; port++) {
    if (taken.includes(port)) {
      continue;
    }
    if (!(await isPortInUse(port))) {
      return port;
    }
  }
  return undefined;
}

/** Resolves true if something is already listening on the port. */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.on('connect', () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.on('error', () => resolvePort(false));
  });
}

/**
 * Asks the OS for a free port and releases it again.
 *
 * The launcher needs the mongod port *before* the database exists, so it can
 * build the connection URI the API is spawned with — which is what lets the
 * database boot alongside API startup instead of after it. The gap between
 * release and bind is the usual small race, and the database phase fails
 * loudly if it is ever lost.
 */
export function reserveFreePort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const probe = createServer();
    probe.on('error', rejectPort);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      probe.close(() =>
        port ? resolvePort(port) : rejectPort(new Error('could not reserve a port'))
      );
    });
  });
}

/** Unref'd so a pending timeout never keeps the process alive on shutdown. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms).unref?.();
  });
}

export async function waitForPort(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortInUse(port)) {
      return true;
    }
    await sleep(500);
  }
  return false;
}
