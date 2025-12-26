import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import type { RecentMessage } from '../../../../schemas/conversation.schema';
import type { TechniqueTemplate } from '../../../../schemas/technique.schema';

import { OpenRouterClientFactory } from '../../../ai/services/openrouter-client.factory';
import { OpenRouterService } from '../openrouter.service';

describe('OpenRouterService', () => {
  let service: OpenRouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenRouterService,
        {
          provide: OpenRouterClientFactory,
          useValue: {
            create: jest.fn(() => ({
              chat: {
                send: jest.fn(),
              },
            })),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENROUTER_API_KEY') {
                return 'test-api-key';
              }
              if (key === 'APP_URL') {
                return 'https://test.mukti.app';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OpenRouterService>(OpenRouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildPrompt', () => {
    /**
     * Feature: conversation-backend, Property: Prompt building includes systemPrompt and history
     * Validates: Requirements 2.7
     */
    it('should include systemPrompt and conversation history for any valid inputs', () => {
      fc.assert(
        fc.property(
          // Generate technique template
          fc.record({
            exampleQuestions: fc.array(fc.string(), {
              maxLength: 5,
              minLength: 1,
            }),
            followUpStrategy: fc.string({ maxLength: 100, minLength: 10 }),
            questioningStyle: fc.string({ maxLength: 50, minLength: 5 }),
            systemPrompt: fc.string({ maxLength: 200, minLength: 20 }),
          }),
          // Generate conversation history
          fc.array(
            fc.record({
              content: fc.string({ maxLength: 200, minLength: 1 }),
              role: fc.constantFrom('user' as const, 'assistant' as const),
              timestamp: fc.date(),
            }),
            { maxLength: 10 },
          ),
          // Generate user message
          fc.string({ maxLength: 200, minLength: 1 }),
          (
            technique: TechniqueTemplate,
            history: RecentMessage[],
            userMessage: string,
          ) => {
            const result = service.buildPrompt(technique, history, userMessage);

            // Property: Result should be an array
            expect(Array.isArray(result)).toBe(true);

            // Property: First message should be system message with technique's systemPrompt
            expect(result[0].role).toBe('system');
            expect(result[0].content).toBe(technique.systemPrompt);

            // Property: History messages should be included in order
            for (let i = 0; i < history.length; i++) {
              expect(result[i + 1].content).toBe(history[i].content);
              expect(result[i + 1].role).toBe(history[i].role);
            }

            // Property: Last message should be the user message
            expect(result[result.length - 1].role).toBe('user');
            expect(result[result.length - 1].content).toBe(userMessage);

            // Property: Total length should be system + history + user message
            expect(result.length).toBe(1 + history.length + 1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle empty conversation history', () => {
      const technique: TechniqueTemplate = {
        exampleQuestions: ['What do you think?'],
        followUpStrategy: 'Ask clarifying questions',
        questioningStyle: 'Socratic',
        systemPrompt: 'You are a Socratic questioner.',
      };

      const result = service.buildPrompt(technique, [], 'Hello');

      expect(result).toHaveLength(2); // system + user message
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
      expect(result[1].content).toBe('Hello');
    });
  });

  describe('parseResponse', () => {
    /**
     * Feature: conversation-backend, Property: Response parsing extracts all required fields
     * Validates: Requirements 2.9
     */
    it('should extract all required fields from any valid API response', () => {
      fc.assert(
        fc.property(
          // Generate mock API response
          fc.record({
            choices: fc.constant([
              {
                message: {
                  content: fc.sample(
                    fc.string({ maxLength: 500, minLength: 1 }),
                    1,
                  )[0],
                },
              },
            ]),
            usage: fc.record({
              completion_tokens: fc.integer({ max: 1000, min: 1 }),
              prompt_tokens: fc.integer({ max: 1000, min: 1 }),
              total_tokens: fc.integer({ max: 2000, min: 2 }),
            }),
          }),
          fc.constantFrom('openai/gpt-3.5-turbo', 'openai/gpt-4'),
          (response: any, model: string) => {
            const result = service.parseResponse(response, model);

            // Property: All required fields should be present
            expect(result).toHaveProperty('content');
            expect(result).toHaveProperty('promptTokens');
            expect(result).toHaveProperty('completionTokens');
            expect(result).toHaveProperty('totalTokens');
            expect(result).toHaveProperty('cost');
            expect(result).toHaveProperty('model');

            // Property: Content should match response
            expect(result.content).toBe(response.choices[0].message.content);

            // Property: Token counts should match usage
            expect(result.promptTokens).toBe(response.usage.prompt_tokens);
            expect(result.completionTokens).toBe(
              response.usage.completion_tokens,
            );
            expect(result.totalTokens).toBe(response.usage.total_tokens);

            // Property: Model should match input
            expect(result.model).toBe(model);

            // Property: Cost is currently treated as unknown
            expect(typeof result.cost).toBe('number');
            expect(result.cost).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle missing usage data gracefully', () => {
      const response: any = {
        choices: [{ message: { content: 'Test response' } }],
        usage: undefined,
      };

      const result = service.parseResponse(response, 'openai/gpt-3.5-turbo');

      expect(result.promptTokens).toBe(0);
      expect(result.completionTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(result.cost).toBe(0);
    });

    it('should handle empty content', () => {
      const response: any = {
        choices: [{ message: { content: '' } }],
        usage: {
          completion_tokens: 0,
          prompt_tokens: 10,
          total_tokens: 10,
        },
      };

      const result = service.parseResponse(response, 'openai/gpt-3.5-turbo');

      expect(result.content).toBe('');
      expect(result.promptTokens).toBe(10);
    });
  });

  describe('handleError', () => {
    /**
     * Feature: conversation-backend, Property 25: OpenRouter errors are logged
     * Validates: Requirements 9.1
     */
    it('should categorize errors correctly for any error type', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Timeout errors
            fc.record({
              code: fc.constant('ETIMEDOUT'),
              message: fc.string(),
            }),
            // Server errors
            fc.record({
              message: fc.string(),
              status: fc.integer({ max: 599, min: 500 }),
            }),
            // Rate limit errors
            fc.record({
              message: fc.string(),
              status: fc.constant(429),
            }),
            // Client errors
            fc.record({
              message: fc.string(),
              status: fc
                .integer({ max: 499, min: 400 })
                .filter((s) => s !== 429),
            }),
          ),
          (error: any) => {
            const result = service.handleError(error);

            // Property: Result should have required fields
            expect(result).toHaveProperty('code');
            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('retriable');

            // Property: Code should be a non-empty string
            expect(typeof result.code).toBe('string');
            expect(result.code.length).toBeGreaterThan(0);

            // Property: Message should be a non-empty string
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);

            // Property: Retriable should be boolean
            expect(typeof result.retriable).toBe('boolean');

            // Property: Timeout errors should be retriable
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
              expect(result.retriable).toBe(true);
              expect(result.code).toBe('TIMEOUT');
            }

            // Property: Server errors (5xx) should be retriable
            if (error.status >= 500 && error.status < 600) {
              expect(result.retriable).toBe(true);
              expect(result.code).toBe('SERVER_ERROR');
            }

            // Property: Rate limit errors should be retriable
            if (error.status === 429) {
              expect(result.retriable).toBe(true);
              expect(result.code).toBe('RATE_LIMIT');
            }

            // Property: Client errors (4xx except 429) should not be retriable
            if (
              error.status >= 400 &&
              error.status < 500 &&
              error.status !== 429
            ) {
              expect(result.retriable).toBe(false);
              expect(result.code).toBe('CLIENT_ERROR');
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle timeout errors', () => {
      const error = { code: 'ETIMEDOUT', message: 'Request timeout' };
      const result = service.handleError(error);

      expect(result.code).toBe('TIMEOUT');
      expect(result.retriable).toBe(true);
    });

    it('should handle server errors', () => {
      const error = { message: 'Internal server error', status: 500 };
      const result = service.handleError(error);

      expect(result.code).toBe('SERVER_ERROR');
      expect(result.retriable).toBe(true);
    });

    it('should handle rate limit errors', () => {
      const error = { message: 'Rate limit exceeded', status: 429 };
      const result = service.handleError(error);

      expect(result.code).toBe('RATE_LIMIT');
      expect(result.retriable).toBe(true);
    });

    it('should handle client errors as non-retriable', () => {
      const error = { message: 'Bad request', status: 400 };
      const result = service.handleError(error);

      expect(result.code).toBe('CLIENT_ERROR');
      expect(result.retriable).toBe(false);
    });

    /**
     * Feature: conversation-backend, Property 27: Failed requests store error details
     * Validates: Requirements 9.4
     */
    it('should provide complete error details for any error', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              code: fc.constantFrom('ETIMEDOUT', 'ECONNABORTED'),
              message: fc.string({ maxLength: 100, minLength: 1 }),
              stack: fc.string(),
            }),
            fc.record({
              message: fc.string({ maxLength: 100, minLength: 1 }),
              stack: fc.string(),
              status: fc.integer({ max: 599, min: 400 }),
            }),
          ),
          (error: any) => {
            const result = service.handleError(error);

            // Property: Error details should contain all required fields
            expect(result).toHaveProperty('code');
            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('retriable');

            // Property: Code should be a descriptive string
            expect(typeof result.code).toBe('string');
            expect(result.code.length).toBeGreaterThan(0);
            expect(result.code).toMatch(/^[A-Z_]+$/); // Should be uppercase with underscores

            // Property: Message should be informative
            expect(typeof result.message).toBe('string');
            expect(result.message.length).toBeGreaterThan(0);

            // Property: Stack trace should be preserved if available
            if (error.stack) {
              expect(result.stack).toBe(error.stack);
            }

            // Property: Error details should be sufficient for debugging
            // All errors should have enough information to understand what went wrong
            expect(result.code).not.toBe('');
            expect(result.message).not.toBe('');
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
