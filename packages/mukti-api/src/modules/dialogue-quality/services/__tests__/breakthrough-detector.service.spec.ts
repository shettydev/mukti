import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { BreakthroughDetectorService } from '../breakthrough-detector.service';

describe('BreakthroughDetectorService', () => {
  let service: BreakthroughDetectorService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BreakthroughDetectorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'DIALOGUE_QUALITY_BREAKTHROUGH_ENABLED') {
                return 'true';
              }
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(BreakthroughDetectorService);
    configService = module.get(ConfigService);
  });

  it('should detect breakthrough when demonstrating understanding after failures', () => {
    const result = service.detect({
      consecutiveFailures: 3,
      demonstratesUnderstanding: true,
    });

    expect(result).not.toBeNull();
    expect(result!.source).toBe('breakthrough');
    expect(result!.priority).toBe(1);
    expect(result!.instruction).toContain('BREAKTHROUGH');
  });

  it('should return null when no failures preceded understanding', () => {
    const result = service.detect({
      consecutiveFailures: 0,
      demonstratesUnderstanding: true,
    });

    expect(result).toBeNull();
  });

  it('should return null when failures but no understanding', () => {
    const result = service.detect({
      consecutiveFailures: 5,
      demonstratesUnderstanding: false,
    });

    expect(result).toBeNull();
  });

  it('should return null when only 1 failure', () => {
    const result = service.detect({
      consecutiveFailures: 1,
      demonstratesUnderstanding: true,
    });

    expect(result).toBeNull();
  });

  it('should return null when disabled via config', () => {
    jest.spyOn(configService, 'get').mockReturnValue('false');

    const result = service.detect({
      consecutiveFailures: 5,
      demonstratesUnderstanding: true,
    });

    expect(result).toBeNull();
  });
});
