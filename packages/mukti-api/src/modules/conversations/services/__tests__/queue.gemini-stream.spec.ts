import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { Conversation } from '../../../../schemas/conversation.schema';
import { Technique } from '../../../../schemas/technique.schema';
import { UsageEvent } from '../../../../schemas/usage-event.schema';
import { User } from '../../../../schemas/user.schema';
import { AiPolicyService } from '../../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../../ai/services/ai-secrets.service';
import { GeminiService } from '../gemini.service';
import { MessageService } from '../message.service';
import { OpenRouterService } from '../openrouter.service';
import { QueueService } from '../queue.service';
import { StreamService } from '../stream.service';

describe('QueueService Gemini Streaming', () => {
  let service: QueueService;
  let streamService: { emitToConversation: jest.Mock };

  beforeEach(async () => {
    streamService = {
      emitToConversation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('conversation-requests'),
          useValue: {
            add: jest.fn(),
            getJob: jest.fn(),
          },
        },
        {
          provide: getModelToken(Conversation.name),
          useValue: {
            findById: jest.fn().mockResolvedValue({
              _id: '507f1f77bcf86cd799439011',
              recentMessages: [],
            }),
          },
        },
        {
          provide: getModelToken(Technique.name),
          useValue: {
            findOne: jest.fn().mockResolvedValue({
              template: {
                exampleQuestions: [],
                followUpStrategy: 'Probe assumptions',
                questioningStyle: 'Socratic',
                systemPrompt: 'Ask reflective questions',
              },
            }),
          },
        },
        {
          provide: getModelToken(UsageEvent.name),
          useValue: {
            create: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue({
                geminiApiKeyEncrypted: 'enc:AIzaSy_test_key',
              }),
              select: jest.fn().mockReturnThis(),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AiPolicyService,
          useValue: {
            getCuratedModels: jest.fn(() => [
              { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
            ]),
            isGeminiModel: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: AiSecretsService,
          useValue: {
            decryptString: jest.fn((value: string) =>
              value.replace(/^enc:/, ''),
            ),
          },
        },
        {
          provide: GeminiService,
          useValue: {
            sendMessage: jest.fn().mockResolvedValue({
              completionTokens: 12,
              content: 'Have you considered alternative assumptions?',
              cost: 0,
              model: 'gemini-2.0-flash',
              promptTokens: 21,
              totalTokens: 33,
            }),
          },
        },
        {
          provide: MessageService,
          useValue: {
            addMessageToConversation: jest.fn().mockResolvedValue({
              _id: {
                toString: () => '507f1f77bcf86cd799439011',
              },
              recentMessages: [
                {
                  content: 'What should I improve?',
                  role: 'user',
                  timestamp: new Date('2025-01-01T00:00:00.000Z'),
                },
                {
                  content: 'Have you considered alternative assumptions?',
                  role: 'assistant',
                  timestamp: new Date('2025-01-01T00:00:00.000Z'),
                },
              ],
              totalMessageCount: 2,
            }),
            archiveOldMessages: jest.fn(),
            buildConversationContext: jest.fn().mockReturnValue({
              messages: [],
              systemPrompt: 'Ask reflective questions',
              technique: {},
            }),
          },
        },
        {
          provide: OpenRouterService,
          useValue: {
            buildPrompt: jest.fn(),
            sendChatCompletion: jest.fn(),
          },
        },
        {
          provide: StreamService,
          useValue: streamService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('emits processing, message(user+assistant), and complete events for Gemini jobs', async () => {
    const result = await service.process({
      data: {
        conversationId: '507f1f77bcf86cd799439011',
        message: 'What should I improve?',
        model: 'gemini-2.0-flash',
        provider: 'gemini',
        subscriptionTier: 'free',
        technique: 'elenchus',
        usedByok: false,
        userId: '507f1f77bcf86cd799439012',
      },
      id: 'job-1',
    } as any);

    const emittedEventTypes = streamService.emitToConversation.mock.calls.map(
      (call) => call[1].type,
    );

    expect(emittedEventTypes).toContain('processing');
    expect(emittedEventTypes).toContain('progress');
    expect(emittedEventTypes).toContain('message');
    expect(emittedEventTypes).toContain('complete');

    expect(streamService.emitToConversation).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      {
        data: {
          content: 'What should I improve?',
          role: 'user',
          sequence: 1,
          timestamp: '2025-01-01T00:00:00.000Z',
        },
        type: 'message',
      },
    );
    expect(streamService.emitToConversation).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      {
        data: {
          content: 'Have you considered alternative assumptions?',
          role: 'assistant',
          sequence: 2,
          timestamp: '2025-01-01T00:00:00.000Z',
          tokens: 33,
        },
        type: 'message',
      },
    );
    expect(streamService.emitToConversation).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      {
        data: {
          cost: 0,
          jobId: 'job-1',
          latency: expect.any(Number),
          tokens: 33,
        },
        type: 'complete',
      },
    );

    expect(result.tokens).toBe(33);
  });
});
