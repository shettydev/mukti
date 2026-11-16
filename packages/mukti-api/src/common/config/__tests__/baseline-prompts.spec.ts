import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  BASELINE_PROMPTS,
  baselineStudyArm,
  configuredStudyArm,
  promptForStudyArm,
} from '../baseline-prompts';

describe('study arm boot configuration and published prompts', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('refuses hosted boot during configuration initialization', async () => {
    delete process.env.MUKTI_LOCAL;
    process.env.MUKTI_STUDY_ARM = 'baseline-socratic';
    await expect(
      Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            validate: (values: NodeJS.ProcessEnv) => {
              configuredStudyArm(values);
              return values;
            },
          }),
        ],
      }).compile(),
    ).rejects.toThrow('MUKTI_STUDY_ARM');
  });

  it('rejects unknown and empty values, and leaves unconfigured launches alone', () => {
    expect(configuredStudyArm({})).toBeUndefined();
    for (const name of ['', 'control']) {
      expect(() =>
        configuredStudyArm({ MUKTI_LOCAL: '1', MUKTI_STUDY_ARM: name }),
      ).toThrow('MUKTI_STUDY_ARM');
    }
  });

  it.each(['baseline-direct', 'baseline-socratic'] as const)(
    'publishes exact %s prompt bytes and hash',
    (name) => {
      const doc = readFileSync(
        resolve(
          __dirname,
          '../../../../../../docs/research/baseline-prompts.md',
        ),
        'utf8',
      );
      const text = doc
        .split(`## ${name}\n\n\`\`\`text\n`)[1]
        ?.split('\n```')[0];
      expect(text).toBe(BASELINE_PROMPTS[name]);
      expect(baselineStudyArm(name).promptSha256).toBe(
        createHash('sha256').update(text).digest('hex'),
      );
      process.env.MUKTI_LOCAL = '1';
      process.env.MUKTI_STUDY_ARM = name;
      const stamp = configuredStudyArm()!;
      delete process.env.MUKTI_STUDY_ARM;
      expect(promptForStudyArm(JSON.parse(JSON.stringify(stamp)))).toBe(text);
      expect(() =>
        promptForStudyArm({ ...stamp, promptSha256: 'wrong' }),
      ).toThrow('hash mismatch');
    },
  );
});
