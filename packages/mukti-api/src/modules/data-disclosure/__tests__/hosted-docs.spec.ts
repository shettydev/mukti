jest.mock('@openrouter/sdk', () => ({ OpenRouter: jest.fn() }));

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { FREE_DAILY_LIMIT } from '../../ai/services/free-quota.service';
import { buildDisclosure } from '../build-disclosure';

const root = resolve(__dirname, '../../../../../..');
const document = () =>
  readFileSync(resolve(root, 'docs/hosted-mode.md'), 'utf8');
const normalize = (text: string) => text.replace(/\s+/g, ' ');

describe('hosted disclosure documentation', () => {
  it('documents every surface and the payload the endpoint describes', () => {
    const markdown = normalize(document());
    for (const ownKey of [false, true]) {
      const disclosure = buildDisclosure({
        freeDailyLimit: FREE_DAILY_LIMIT,
        hasOwnOpenRouterKey: ownKey,
        mode: 'hosted',
        now: new Date('2026-11-09T00:00:00Z'),
      });
      for (const surface of disclosure.surfaces) {
        expect(markdown).toContain(`### ${surface.label}`);
        for (const sent of surface.sends) {
          expect(markdown).toContain(sent);
        }
        expect(markdown).toContain(surface.keyNote);
      }
    }
    expect(markdown).toContain(`${FREE_DAILY_LIMIT} replies a day`);
    expect(markdown).toContain('00:00 UTC');
    expect(markdown).toContain('DELETE /me/data');
    expect(markdown).toContain('DELETE /me');
  });

  it('links existing hosted and local guides from the README and privacy FAQ', () => {
    const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
    for (const guide of ['local-mode', 'hosted-mode']) {
      expect(readme).toContain(`docs/${guide}.md`);
      expect(existsSync(resolve(root, `docs/${guide}.md`))).toBe(true);
    }
    const constants = readFileSync(
      resolve(root, 'packages/mukti-web/src/components/landing/constants.ts'),
      'utf8',
    );
    const faq = readFileSync(
      resolve(
        root,
        'packages/mukti-web/src/components/landing/landing-faq.tsx',
      ),
      'utf8',
    );
    expect(constants).toContain('/docs/hosted-mode.md');
    expect(faq).toContain('HOSTED_MODE_PRIVACY_URL');
    expect(faq).not.toContain(
      'We don&apos;t train on your data or share it with third parties.',
    );
  });
});
