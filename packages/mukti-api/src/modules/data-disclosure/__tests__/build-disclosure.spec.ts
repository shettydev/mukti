// Descriptors live in service files that import the ESM-only OpenRouter SDK.
jest.mock('@openrouter/sdk', () => ({ OpenRouter: jest.fn() }));

import { providerById } from '../../ai/local-cli/provider-catalog';
import { buildDisclosure, type DisclosureContext } from '../build-disclosure';

/**
 * data-flow-disclosure: the disclosure is generated per configuration, and
 * never carries statements that belong to another one.
 */
const NOW = new Date('2026-11-09T15:30:00Z');

const hostedFree: DisclosureContext = {
  freeDailyLimit: 10,
  hasOwnOpenRouterKey: false,
  mode: 'hosted',
  now: NOW,
};

const hostedOwnKey: DisclosureContext = {
  ...hostedFree,
  hasOwnOpenRouterKey: true,
};

const local = (
  cli: 'agy' | 'claude' | 'codex',
  dataDir = '/home/me/.mukti',
): DisclosureContext => ({
  dataDir,
  mode: 'local',
  now: NOW,
  provider: providerById(cli)!,
});

const text = (value: unknown) => JSON.stringify(value);

describe('buildDisclosure', () => {
  describe('hosted free tier', () => {
    const disclosure = buildDisclosure(hostedFree);

    it('names OpenRouter on Mukti’s key, the daily limit and its reset', () => {
      expect(disclosure.configuration).toBe('hosted-free');
      expect(disclosure.model.runner).toMatch(/OpenRouter/);
      expect(disclosure.model.billedTo).toMatch(/Mukti/);
      expect(disclosure.model.limits).toEqual({
        dailyMessages: 10,
        kind: 'free-daily',
        resetsAt: '2026-11-10T00:00:00.000Z',
      });
    });

    it('lists misconception detection on the platform key with the last 3 turns', () => {
      const misconception = disclosure.surfaces.find(
        (s) => s.id === 'misconception-detection',
      );

      expect(misconception).toMatchObject({
        historyWindow: 3,
        key: 'platform',
      });
      expect(misconception!.keyNote).toMatch(/Mukti's key/);
    });

    it('stores data in the hosted database and says nothing about CLIs', () => {
      expect(disclosure.storage.location).toMatch(/hosted database/);
      expect(disclosure.outside).toEqual([]);
      expect(text(disclosure)).not.toMatch(/Antigravity|Codex|Claude Code/);
    });
  });

  describe('hosted with own key', () => {
    const disclosure = buildDisclosure(hostedOwnKey);

    it('says their key is used for Socratic replies and stored encrypted', () => {
      expect(disclosure.configuration).toBe('hosted-own-key');
      expect(disclosure.model.billedTo).toMatch(/your own OpenRouter key/);
      expect(disclosure.model.billedTo).toMatch(/encrypted/);
      expect(disclosure.surfaces.find((s) => s.id === 'chat')!.keyNote).toMatch(
        /your key/i,
      );
    });

    it('does not present the free daily quota as theirs', () => {
      expect(disclosure.model.limits).toEqual({ kind: 'own-plan' });
      expect(text(disclosure)).not.toMatch(/free daily|10 messages/i);
    });

    it('still runs misconception detection on Mukti’s key, not theirs', () => {
      expect(
        disclosure.surfaces.find((s) => s.id === 'misconception-detection')!
          .key,
      ).toBe('platform');
    });
  });

  describe('local mode', () => {
    it('on Codex describes Codex only, with no OpenRouter, quota or Antigravity history', () => {
      const disclosure = buildDisclosure(local('codex'));
      const all = text(disclosure);

      expect(disclosure.configuration).toBe('local');
      expect(disclosure.model.runner).toMatch(/Codex CLI/);
      expect(disclosure.model.billedTo).toMatch(/your own .*subscription/i);
      expect(all).not.toMatch(/OpenRouter|free daily|Antigravity|~\/\.gemini/);
      expect(disclosure.outside).toEqual([]);
    });

    it('lists misconception detection as not run', () => {
      const disclosure = buildDisclosure(local('claude'));

      expect(disclosure.surfaces.map((s) => s.id)).not.toContain(
        'misconception-detection',
      );
      expect(disclosure.notRun.map((s) => s.id)).toEqual([
        'misconception-detection',
      ]);
    });

    it('on Antigravity names the history it keeps under a mukti-socratic project', () => {
      const disclosure = buildDisclosure(local('agy'));

      expect(disclosure.outside).toHaveLength(1);
      expect(disclosure.outside[0].where).toBe('~/.gemini/antigravity-cli');
      expect(disclosure.outside[0].howToRemove).toMatch(/mukti-socratic/);
      expect(disclosure.outside[0].removedByMukti).toBe(false);
    });

    it('states the database location under the data directory it was started with', () => {
      const disclosure = buildDisclosure(local('claude', '/tmp/m'));

      expect(disclosure.storage.location).toMatch(/^\/tmp\/m/);
    });

    it('says the CLI sends requests to its vendor, never that it runs on-device', () => {
      const disclosure = buildDisclosure(local('claude'));

      expect(disclosure.model.runner).toMatch(/vendor's servers/);
      expect(text(disclosure)).not.toMatch(
        /on-device|offline|runs locally on your machine/i,
      );
    });

    it('describes each CLI by its own name', () => {
      expect(buildDisclosure(local('claude')).model.runner).toMatch(
        /Claude CLI/,
      );
      expect(buildDisclosure(local('agy')).model.runner).toMatch(
        /Antigravity CLI/,
      );
    });
  });

  it('lists the canvas node entry from the surface descriptor', () => {
    const canvas = buildDisclosure(hostedFree).surfaces.find(
      (s) => s.id === 'canvas-node',
    )!;

    expect(canvas.sends.join(' ')).toMatch(
      /problem statement, constraints and assumptions/,
    );
    expect(canvas.historyWindow).toBe(50);
  });

  it('links the in-app deletion action', () => {
    expect(buildDisclosure(hostedFree).deletion).toEqual({
      action: 'settings#delete-data',
      label: 'Delete all my Mukti data',
    });
  });
});
