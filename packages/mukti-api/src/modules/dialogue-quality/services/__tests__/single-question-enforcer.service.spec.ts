import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { SingleQuestionEnforcerService } from '../single-question-enforcer.service';

describe('SingleQuestionEnforcerService', () => {
  let service: SingleQuestionEnforcerService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SingleQuestionEnforcerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'DIALOGUE_QUALITY_SINGLE_QUESTION_ENABLED') {
                return 'true';
              }
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SingleQuestionEnforcerService);
    configService = module.get(ConfigService);
  });

  it('should return single-question directive when enabled', () => {
    const result = service.getDirective();

    expect(result).not.toBeNull();
    expect(result!.source).toBe('single-question');
    expect(result!.priority).toBe(10);
    expect(result!.instruction).toContain('ONE question');
  });

  it('should return null when disabled via config', () => {
    jest.spyOn(configService, 'get').mockReturnValue('false');

    const result = service.getDirective();
    expect(result).toBeNull();
  });
});
