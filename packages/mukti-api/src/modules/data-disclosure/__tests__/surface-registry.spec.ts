// The registry imports the services' own files, and through them the ESM-only
// OpenRouter SDK, which Jest cannot load. Nothing here calls it.
jest.mock('@openrouter/sdk', () => ({ OpenRouter: jest.fn() }));

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

import { CHAT_HISTORY_WINDOW } from '../../conversations/services/message.service';
import { MISCONCEPTION_HISTORY_TURNS } from '../../dialogue-quality/services/misconception-detector.service';
import { CANVAS_DIALOGUE_HISTORY_WINDOW } from '../../dialogue/services/dialogue-queue.service';
import { THOUGHT_MAP_DIALOGUE_HISTORY_WINDOW } from '../../thought-map/services/thought-map-dialogue-queue.service';
import { SURFACE_DESCRIPTORS, surfacesFor } from '../surface-registry';

/**
 * data-flow-disclosure, "Disclosure statements come from the running code".
 *
 * Every service that can reach a model has a descriptor, and every history
 * window a descriptor states is the one the running code uses: the call site
 * must read the same named constant, so inlining a different number fails
 * here, naming the surface.
 */
const SRC = join(__dirname, '..', '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(path);
    }
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });
}

const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

/** Classes that inject the AI client factory: every one can call a model. */
function modelCallingServices(): { file: string; name: string }[] {
  return sourceFiles(SRC)
    .filter((file) =>
      readFileSync(file, 'utf8').includes('@Inject(AI_CHAT_CLIENT_FACTORY)'),
    )
    .map((file) => {
      const match = /export class (\w+)/.exec(readFileSync(file, 'utf8'));
      return { file: relative(SRC, file), name: match?.[1] ?? '(anonymous)' };
    });
}

/** Where each window is used at runtime, and the constant it must read. */
const RUNTIME_WINDOWS: Record<
  string,
  { file: string; size: number; usage: RegExp }[]
> = {
  'canvas-node': [
    {
      file: 'modules/dialogue/services/dialogue-queue.service.ts',
      size: CANVAS_DIALOGUE_HISTORY_WINDOW,
      usage: /limit:\s*CANVAS_DIALOGUE_HISTORY_WINDOW\b/,
    },
  ],
  chat: [
    {
      file: 'modules/conversations/services/message.service.ts',
      size: CHAT_HISTORY_WINDOW,
      usage: /-CHAT_HISTORY_WINDOW\b/,
    },
    {
      file: 'modules/conversations/services/queue.service.ts',
      size: CHAT_HISTORY_WINDOW,
      usage: /recentMessages\.length\s*>\s*CHAT_HISTORY_WINDOW\b/,
    },
  ],
  'misconception-detection': [
    {
      file: 'modules/dialogue-quality/services/misconception-detector.service.ts',
      size: MISCONCEPTION_HISTORY_TURNS,
      usage: /\.slice\(-MISCONCEPTION_HISTORY_TURNS\)/,
    },
  ],
  'thought-map-node': [
    {
      file: 'modules/thought-map/services/thought-map-dialogue-queue.service.ts',
      size: THOUGHT_MAP_DIALOGUE_HISTORY_WINDOW,
      usage: /limit:\s*THOUGHT_MAP_DIALOGUE_HISTORY_WINDOW\b/,
    },
  ],
};

describe('surface registry', () => {
  it('has a descriptor for every service that can call a model', () => {
    const covered = new Set(SURFACE_DESCRIPTORS.flatMap((d) => d.services));
    const missing = modelCallingServices().filter(
      ({ name }) => !covered.has(name),
    );

    expect(missing).toEqual([]);
  });

  it('covers the seven surfaces, with unique ids', () => {
    const ids = SURFACE_DESCRIPTORS.map((d) => d.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([
      'branch-suggestion',
      'canvas-node',
      'chat',
      'concept-extraction',
      'misconception-detection',
      'thought-map-extraction',
      'thought-map-node',
    ]);
  });

  it.each(Object.entries(RUNTIME_WINDOWS))(
    'states the history window %s uses at runtime',
    (id, uses) => {
      const descriptor = SURFACE_DESCRIPTORS.find((d) => d.id === id);
      expect(descriptor).toBeDefined();

      for (const { file, size, usage } of uses) {
        expect({
          file,
          surface: id,
          usesConstant: usage.test(read(file)),
        }).toEqual({
          file,
          surface: id,
          usesConstant: true,
        });
        expect(descriptor!.historyWindow).toBe(size);
      }
      expect(descriptor!.sends.join(' ')).toContain(
        `last ${descriptor!.historyWindow}`,
      );
    },
  );

  it('describes the canvas node dialogue in the words the disclosure promises', () => {
    const canvas = SURFACE_DESCRIPTORS.find((d) => d.id === 'canvas-node')!;
    const sends = canvas.sends.join(' ');

    expect(sends).toMatch(/node's label/);
    expect(sends).toMatch(/problem statement, constraints and assumptions/);
    expect(sends.toLowerCase()).toContain(
      `up to the last ${CANVAS_DIALOGUE_HISTORY_WINDOW} messages`,
    );
  });

  it('runs misconception detection on the platform key, in hosted mode only', () => {
    const misconception = SURFACE_DESCRIPTORS.find(
      (d) => d.id === 'misconception-detection',
    )!;

    expect(misconception.key).toBe('platform');
    expect(misconception.runsIn).toEqual(['hosted']);
    expect(surfacesFor('local').map((d) => d.id)).not.toContain(
      'misconception-detection',
    );
    expect(surfacesFor('hosted').map((d) => d.id)).toContain(
      'misconception-detection',
    );
  });
});
