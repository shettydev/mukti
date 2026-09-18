/**
 * Where `npx muktiai` keeps its state.
 *
 * @remarks
 * There is no repository checkout in this mode, so the repo-relative `.mukti/`
 * the contributor launcher uses has nothing to be relative to. Writing it into
 * whatever directory the user happened to run `npx` from would scatter
 * database files across their filesystem and lose their conversations the
 * moment they ran it from somewhere else. A single user-level directory keeps
 * data in one predictable place across runs.
 */
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

/** Environment variable that overrides the data directory. */
export const MUKTI_HOME_ENV = 'MUKTI_HOME';

export interface MuktiHome {
  /** Embedded database files. Persisted, so conversations survive restarts. */
  readonly dbPath: string;
  /** Service logs. */
  readonly logDir: string;
  readonly root: string;
}

/**
 * Resolves the Mukti home directory and creates the database and log
 * directories inside it.
 */
export function resolveMuktiHome(override?: string): MuktiHome {
  const root = resolveMuktiRoot(override);

  const home: MuktiHome = {
    dbPath: join(root, 'local-db'),
    logDir: join(root, 'logs'),
    root,
  };

  mkdirSync(home.dbPath, { recursive: true });
  mkdirSync(home.logDir, { recursive: true });

  return home;
}

/**
 * Resolves the Mukti home directory, creating nothing.
 *
 * Precedence: an explicit `--data-dir`, then `MUKTI_HOME`, then `~/.mukti`.
 * A relative override is resolved against the current directory, since that is
 * what someone typing one would mean.
 *
 * @remarks
 * Separate from {@link resolveMuktiHome} because the launcher reads its saved
 * settings from this directory on every start, including starts that never
 * touch the database — asking where the home is must not bring a database
 * directory into existence.
 */
export function resolveMuktiRoot(override?: string): string {
  const chosen = override ?? process.env[MUKTI_HOME_ENV];
  return chosen
    ? isAbsolute(chosen)
      ? chosen
      : resolve(process.cwd(), chosen)
    : join(homedir(), '.mukti');
}
