import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AcknowledgmentProtocolService } from '../acknowledgment-protocol.service';

describe('AcknowledgmentProtocolService', () => {
  let service: AcknowledgmentProtocolService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AcknowledgmentProtocolService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'DIALOGUE_QUALITY_ACKNOWLEDGMENT_ENABLED') {
                return 'true';
              }
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AcknowledgmentProtocolService);
    configService = module.get(ConfigService);
  });

  it('should return acknowledgment directive when understanding is demonstrated', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.source).toBe('acknowledgment');
    expect(result!.priority).toBe(2);
    expect(result!.instruction).toContain('ACKNOWLEDGMENT PROTOCOL');
  });

  it('should return null when understanding is not demonstrated', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: false,
      scaffoldLevel: 0,
    });

    expect(result).toBeNull();
  });

  it('should return null when understanding is undefined', () => {
    const result = service.getDirective({
      scaffoldLevel: 0,
    });

    expect(result).toBeNull();
  });

  it('should return null when disabled via config', () => {
    jest.spyOn(configService, 'get').mockReturnValue('false');

    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 0,
    });

    expect(result).toBeNull();
  });

  it('should use minimal validation style at Level 0 (Pure Socratic)', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 0,
    });

    expect(result!.instruction).toContain("Yes, that's right");
    expect(result!.instruction).toContain('DEEPEN immediately');
  });

  it('should use reflective validation style at Level 1 (Meta-Cognitive)', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 1,
    });

    expect(result!.instruction).toContain('reflectively');
    expect(result!.instruction).toContain('What made you arrive at that');
  });

  it('should use connective validation style at Level 2 (Strategic Hints)', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 2,
    });

    expect(result!.instruction).toContain('connectively');
    expect(result!.instruction).toContain('How does this piece fit');
  });

  it('should use pattern-confirming style at Level 3 (Worked Examples)', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 3,
    });

    expect(result!.instruction).toContain('correctly applied the pattern');
  });

  it('should use explicit validation style at Level 4 (Direct Instruction)', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 4,
    });

    expect(result!.instruction).toContain('explicitly');
    expect(result!.instruction).toContain('works because');
  });

  it('should always forbid emotional praise in the directive', () => {
    for (let level = 0; level <= 4; level++) {
      const result = service.getDirective({
        demonstratesUnderstanding: true,
        scaffoldLevel: level,
      });

      expect(result!.instruction).toContain('NEVER use emotional praise');
      expect(result!.instruction).toContain('"good job"');
    }
  });

  it('should fire on first correct answer (zero consecutive failures)', () => {
    const result = service.getDirective({
      demonstratesUnderstanding: true,
      scaffoldLevel: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.source).toBe('acknowledgment');
  });
});
