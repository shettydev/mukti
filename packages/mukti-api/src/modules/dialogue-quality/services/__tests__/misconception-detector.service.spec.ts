jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(),
}));

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { OpenRouterClientFactory } from '../../../ai/services/openrouter-client.factory';
import { MisconceptionDetectorService } from '../misconception-detector.service';

describe('MisconceptionDetectorService', () => {
  let service: MisconceptionDetectorService;
  let configService: ConfigService;
  let clientFactory: OpenRouterClientFactory;
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MisconceptionDetectorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              const config: Record<string, string> = {
                DIALOGUE_QUALITY_MISCONCEPTION_ENABLED: 'true',
                DIALOGUE_QUALITY_MISCONCEPTION_MODEL:
                  'google/gemini-3-flash-preview',
                OPENROUTER_API_KEY: 'test-platform-key',
              };
              return config[key] ?? defaultVal;
            }),
          },
        },
        {
          provide: OpenRouterClientFactory,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: 'QUALITY_REDIS_CLIENT',
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get(MisconceptionDetectorService);
    configService = module.get(ConfigService);
    clientFactory = module.get(OpenRouterClientFactory);
  });

  it('should return no misconception when disabled', async () => {
    jest.spyOn(configService, 'get').mockReturnValue('false');

    const result = await service.detect({
      userId: 'user1',
      userMessage: 'The sun revolves around the earth',
    });

    expect(result).toEqual({ fromCache: false, hasMisconception: false });
  });

  it('should return cached result on cache hit', async () => {
    const cached = {
      conceptName: 'heliocentrism',
      fromCache: false,
      hasMisconception: true,
    };
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.detect({
      conceptContext: ['astronomy'],
      userId: 'user1',
      userMessage: 'The sun revolves around the earth',
    });

    expect(result.fromCache).toBe(true);
    expect(result.hasMisconception).toBe(true);
    expect(clientFactory.create).not.toHaveBeenCalled();
  });

  it('should call LLM on cache miss and cache the result', async () => {
    redis.get.mockResolvedValue(null);

    const mockSend = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              conceptName: 'gravity',
              correctDirection: 'Consider mass and acceleration',
              detectedBelief: 'Objects fall because they are heavy',
              hasMisconception: true,
            }),
          },
        },
      ],
    });

    (clientFactory.create as jest.Mock).mockReturnValue({
      chat: { send: mockSend },
    });

    const result = await service.detect({
      conceptContext: ['physics'],
      conversationHistory: [
        { content: 'What makes things fall?', role: 'assistant' },
        { content: 'Objects fall because they are heavy', role: 'user' },
      ],
      userId: 'user1',
      userMessage: 'Objects fall because they are heavy',
    });

    expect(result.hasMisconception).toBe(true);
    expect(result.conceptName).toBe('gravity');
    expect(result.fromCache).toBe(false);
    expect(redis.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'EX',
      3600,
    );
  });

  it('should fail open on timeout', async () => {
    redis.get.mockResolvedValue(null);

    const mockSend = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );
    (clientFactory.create as jest.Mock).mockReturnValue({
      chat: { send: mockSend },
    });

    const result = await service.detect({
      userId: 'user1',
      userMessage: 'Some message',
    });

    expect(result.hasMisconception).toBe(false);
    expect(result.fromCache).toBe(false);
  });

  it('should fail open on LLM error', async () => {
    redis.get.mockResolvedValue(null);

    const mockSend = jest.fn().mockRejectedValue(new Error('API error'));
    (clientFactory.create as jest.Mock).mockReturnValue({
      chat: { send: mockSend },
    });

    const result = await service.detect({
      userId: 'user1',
      userMessage: 'Some message',
    });

    expect(result.hasMisconception).toBe(false);
  });

  it('should fail open when platform key is not configured', async () => {
    jest
      .spyOn(configService, 'get')
      .mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'OPENROUTER_API_KEY') {
          return undefined;
        }
        if (key === 'DIALOGUE_QUALITY_MISCONCEPTION_ENABLED') {
          return 'true';
        }
        return defaultVal;
      });
    redis.get.mockResolvedValue(null);

    const result = await service.detect({
      userId: 'user1',
      userMessage: 'Some message',
    });

    expect(result.hasMisconception).toBe(false);
    expect(clientFactory.create).not.toHaveBeenCalled();
  });
});
