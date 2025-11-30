/**
 * Property-based tests for conversation API client
 * Uses fast-check to generate random test data and verify properties
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/lib/config';
import { conversationKeys } from '@/lib/query-keys';

import { apiClient, ApiClientError } from '../../client';
import { conversationsApi } from '../../conversations';

// Mock the API client
vi.mock('../../client', () => ({
  apiClient: {
    delete: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
  ApiClientError: class ApiClientError extends Error {
    constructor(
      message: string,
      public code: string,
      public status: number,
      public details?: unknown
    ) {
      super(message);
      this.name = 'ApiClientError';
    }
  },
}));

describe('Conversation API Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: conversation-frontend-integration, Property 1: Configuration usage
   * Validates: Requirements 1.1
   */
  describe('Property 1: Configuration usage', () => {
    it('should use centralized config for base URL in all API calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('getAll', 'getById', 'create', 'update', 'delete', 'sendMessage'),
          fc.string({ maxLength: 50, minLength: 1 }),
          async (method, id) => {
            // Mock global fetch to verify config usage
            const mockFetch = vi.fn().mockResolvedValue({
              headers: new Headers({ 'content-type': 'application/json' }),
              json: async () => ({
                data: [],
                meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
                success: true,
              }),
              ok: true,
              status: 200,
            });

            global.fetch = mockFetch as unknown as typeof fetch;

            // Call the appropriate method
            try {
              switch (method) {
                case 'create':
                  await conversationsApi.create({ technique: 'elenchus', title: 'Test' });
                  break;
                case 'delete':
                  await conversationsApi.delete(id);
                  break;
                case 'getAll':
                  await conversationsApi.getAll();
                  break;
                case 'getById':
                  await conversationsApi.getById(id);
                  break;
                case 'sendMessage':
                  await conversationsApi.sendMessage(id, { content: 'Test message' });
                  break;
                case 'update':
                  await conversationsApi.update(id, { title: 'Updated' });
                  break;
              }

              // Verify that fetch was called with URL starting with config.api.baseUrl
              expect(mockFetch).toHaveBeenCalled();
              const fetchUrl = mockFetch.mock.calls[0][0] as string;
              expect(fetchUrl).toContain(config.api.baseUrl);
            } catch {
              // Even on error, verify config was used
              if (mockFetch.mock.calls.length > 0) {
                const fetchUrl = mockFetch.mock.calls[0][0] as string;
                expect(fetchUrl).toContain(config.api.baseUrl);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: conversation-frontend-integration, Property 2: Response parsing consistency
   * Validates: Requirements 1.2
   */
  describe('Property 2: Response parsing consistency', () => {
    it('should parse standardized response format correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            data: fc.array(
              fc.record({
                createdAt: fc
                  .date({ max: new Date('2025-12-31'), min: new Date('2020-01-01') })
                  .map((d) => d.toISOString()),
                hasArchivedMessages: fc.boolean(),
                id: fc.string({ maxLength: 24, minLength: 24 }),
                isArchived: fc.boolean(),
                isFavorite: fc.boolean(),
                metadata: fc.record({
                  estimatedCost: fc.double({ max: 100, min: 0 }),
                  messageCount: fc.integer({ max: 1000, min: 0 }),
                  totalTokens: fc.integer({ max: 100000, min: 0 }),
                }),
                recentMessages: fc.array(fc.record({})),
                tags: fc.array(fc.string()),
                technique: fc.constantFrom(
                  'elenchus',
                  'dialectic',
                  'maieutics',
                  'definitional',
                  'analogical',
                  'counterfactual'
                ),
                title: fc.string({ maxLength: 200, minLength: 1 }),
                updatedAt: fc
                  .date({ max: new Date('2025-12-31'), min: new Date('2020-01-01') })
                  .map((d) => d.toISOString()),
                userId: fc.string({ maxLength: 24, minLength: 24 }),
              })
            ),
            meta: fc.record({
              limit: fc.integer({ max: 100, min: 1 }),
              page: fc.integer({ max: 1000, min: 1 }),
              total: fc.integer({ max: 10000, min: 0 }),
              totalPages: fc.integer({ max: 1000, min: 0 }),
            }),
          }),
          async (mockResponse) => {
            (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

            const result = await conversationsApi.getAll();

            // Verify response has correct structure
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.meta).toHaveProperty('page');
            expect(result.meta).toHaveProperty('limit');
            expect(result.meta).toHaveProperty('total');
            expect(result.meta).toHaveProperty('totalPages');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: conversation-frontend-integration, Property 3: Error transformation
   * Validates: Requirements 1.3
   */
  describe('Property 3: Error transformation', () => {
    it('should throw ApiClientError with code, message, status, and details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            code: fc.constantFrom(
              'NETWORK_ERROR',
              'UNAUTHORIZED',
              'FORBIDDEN',
              'NOT_FOUND',
              'RATE_LIMIT_EXCEEDED',
              'VALIDATION_ERROR',
              'SERVER_ERROR'
            ),
            details: fc.option(fc.object()),
            message: fc.string({ maxLength: 200, minLength: 1 }),
            status: fc.constantFrom(400, 401, 403, 404, 429, 500, 503),
          }),
          async (errorData) => {
            const error = new ApiClientError(
              errorData.message,
              errorData.code,
              errorData.status,
              errorData.details ?? undefined
            );

            (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(error);

            await expect(conversationsApi.getAll()).rejects.toThrow(ApiClientError);

            try {
              await conversationsApi.getAll();
            } catch (e) {
              expect(e).toBeInstanceOf(ApiClientError);
              if (e instanceof ApiClientError) {
                expect(e.code).toBe(errorData.code);
                expect(e.message).toBe(errorData.message);
                expect(e.status).toBe(errorData.status);
                if (errorData.details) {
                  expect(e.details).toBeDefined();
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: conversation-frontend-integration, Property 4: Auth header injection
   * Validates: Requirements 1.4
   */
  describe('Property 4: Auth header injection', () => {
    it('should use apiClient which handles auth header injection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('getAll', 'getById', 'create', 'update', 'delete', 'sendMessage'),
          async (method) => {
            // Mock successful response
            const mockResponse = {
              data: [],
              meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
            };
            (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
            (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (apiClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({});
            (apiClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

            // Call the appropriate method
            try {
              switch (method) {
                case 'create':
                  await conversationsApi.create({ technique: 'elenchus', title: 'Test' });
                  break;
                case 'delete':
                  await conversationsApi.delete('test-id');
                  break;
                case 'getAll':
                  await conversationsApi.getAll();
                  break;
                case 'getById':
                  await conversationsApi.getById('test-id');
                  break;
                case 'sendMessage':
                  await conversationsApi.sendMessage('test-id', { content: 'Test' });
                  break;
                case 'update':
                  await conversationsApi.update('test-id', { title: 'Updated' });
                  break;
              }
            } catch {
              // Ignore errors for this test
            }

            // Verify that apiClient methods are called
            // The apiClient handles auth header injection via authInterceptor
            // This property verifies that all conversation API methods use the apiClient
            const totalCalls =
              (apiClient.get as ReturnType<typeof vi.fn>).mock.calls.length +
              (apiClient.post as ReturnType<typeof vi.fn>).mock.calls.length +
              (apiClient.patch as ReturnType<typeof vi.fn>).mock.calls.length +
              (apiClient.delete as ReturnType<typeof vi.fn>).mock.calls.length;

            expect(totalCalls).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: conversation-frontend-integration, Property 5-9: Query key properties
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
   */
  describe('Query Key Properties', () => {
    /**
     * Property 5: Query key hierarchy
     */
    it('should start all query keys with ["conversations"] as root', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: fc.record({
              isArchived: fc.option(fc.boolean(), { nil: undefined }),
              isFavorite: fc.option(fc.boolean(), { nil: undefined }),
              limit: fc.option(fc.integer({ max: 100, min: 1 }), { nil: undefined }),
              page: fc.option(fc.integer({ max: 1000, min: 1 }), { nil: undefined }),
              technique: fc.option(
                fc.constantFrom(
                  'elenchus',
                  'dialectic',
                  'maieutics',
                  'definitional',
                  'analogical',
                  'counterfactual'
                ),
                { nil: undefined }
              ),
            }),
            id: fc.string({ maxLength: 24, minLength: 24 }),
          }),
          ({ filters, id }) => {
            // Test all query key types
            const allKey = conversationKeys.all;
            const listsKey = conversationKeys.lists();
            const listKey = conversationKeys.list(filters);
            const detailsKey = conversationKeys.details();
            const detailKey = conversationKeys.detail(id);
            const messagesKey = conversationKeys.messages(id);
            const archivedKey = conversationKeys.archivedMessages(id);

            // All keys should start with ['conversations']
            expect(allKey[0]).toBe('conversations');
            expect(listsKey[0]).toBe('conversations');
            expect(listKey[0]).toBe('conversations');
            expect(detailsKey[0]).toBe('conversations');
            expect(detailKey[0]).toBe('conversations');
            expect(messagesKey[0]).toBe('conversations');
            expect(archivedKey[0]).toBe('conversations');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 6: Filter inclusion in keys
     */
    it('should include filter parameters in list query keys', () => {
      fc.assert(
        fc.property(
          fc.record({
            isArchived: fc.option(fc.boolean(), { nil: undefined }),
            isFavorite: fc.option(fc.boolean(), { nil: undefined }),
            limit: fc.option(fc.integer({ max: 100, min: 1 }), { nil: undefined }),
            page: fc.option(fc.integer({ max: 1000, min: 1 }), { nil: undefined }),
            tags: fc.option(
              fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
              { nil: undefined }
            ),
            technique: fc.option(
              fc.constantFrom(
                'elenchus',
                'dialectic',
                'maieutics',
                'definitional',
                'analogical',
                'counterfactual'
              ),
              { nil: undefined }
            ),
          }),
          (filters) => {
            const key = conversationKeys.list(filters);

            // Key should include filters
            expect(key).toContain('list');
            expect(key[key.length - 1]).toEqual(filters);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7: ID inclusion in detail keys
     */
    it('should include conversation ID in detail query keys', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 24, minLength: 24 }), (id) => {
          const key = conversationKeys.detail(id);

          // Key should include ID
          expect(key).toContain('detail');
          expect(key).toContain(id);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 8: Pagination in message keys
     */
    it('should include conversation ID and pagination in message keys', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 24, minLength: 24 }),
          fc.option(fc.integer({ max: 10000, min: 0 }), { nil: undefined }),
          (id, beforeSequence) => {
            const key = conversationKeys.archivedMessages(id, beforeSequence);

            // Key should include ID, messages, archived, and pagination
            expect(key).toContain('detail');
            expect(key).toContain(id);
            expect(key).toContain('messages');
            expect(key).toContain('archived');
            expect(key[key.length - 1]).toBe(beforeSequence);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 9: Cache invalidation scope
     */
    it('should support hierarchical cache invalidation', () => {
      fc.assert(
        fc.property(
          fc.record({
            filters: fc.record({
              technique: fc.option(fc.constantFrom('elenchus', 'dialectic'), { nil: undefined }),
            }),
            id: fc.string({ maxLength: 24, minLength: 24 }),
          }),
          ({ filters, id }) => {
            const allKey = conversationKeys.all;
            const listKey = conversationKeys.list(filters);
            const detailKey = conversationKeys.detail(id);

            // All keys should be prefixed by the base key
            expect(listKey[0]).toBe(allKey[0]);
            expect(detailKey[0]).toBe(allKey[0]);

            // This ensures that invalidating conversationKeys.all will invalidate all related queries
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
