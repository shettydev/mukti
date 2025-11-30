/**
 * Unit tests for conversation API client
 */

import type {
  Conversation,
  CreateConversationDto,
  Message,
  PaginatedConversations,
  SendMessageResponse,
  UpdateConversationDto,
} from '@/types/conversation.types';

import { apiClient, ApiClientError } from '../client';
import { conversationsApi } from '../conversations';

// Mock the API client
jest.mock('../client', () => ({
  apiClient: {
    delete: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
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

describe('conversationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch conversations without filters', async () => {
      const mockData: PaginatedConversations = {
        data: [],
        meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockData);

      const result = await conversationsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/conversations');
      expect(result).toEqual(mockData);
    });

    it('should fetch conversations with technique filter', async () => {
      const mockData: PaginatedConversations = {
        data: [],
        meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockData);

      const filters = { technique: 'elenchus' as const };
      await conversationsApi.getAll(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/conversations?technique=elenchus');
    });

    it('should fetch conversations with multiple filters', async () => {
      const mockData: PaginatedConversations = {
        data: [],
        meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockData);

      const filters = {
        isArchived: false,
        isFavorite: true,
        limit: 10,
        page: 2,
        sort: 'updatedAt' as const,
        tags: ['react', 'performance'],
        technique: 'elenchus' as const,
      };
      await conversationsApi.getAll(filters);

      const call = (apiClient.get as jest.Mock).mock.calls[0][0];
      expect(call).toContain('technique=elenchus');
      // Tags are URL encoded, so comma becomes %2C
      expect(call).toMatch(/tags=react(%2C|,)performance/);
      expect(call).toContain('isArchived=false');
      expect(call).toContain('isFavorite=true');
      expect(call).toContain('sort=updatedAt');
      expect(call).toContain('page=2');
      expect(call).toContain('limit=10');
    });

    it('should handle empty filters', async () => {
      const mockData: PaginatedConversations = {
        data: [],
        meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockData);

      await conversationsApi.getAll({});

      expect(apiClient.get).toHaveBeenCalledWith('/conversations');
    });
  });

  describe('getById', () => {
    it('should fetch conversation by ID', async () => {
      const mockConversation: Partial<Conversation> = {
        id: '507f1f77bcf86cd799439011',
        tags: [],
        technique: 'elenchus',
        title: 'Test Conversation',
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockConversation);

      const result = await conversationsApi.getById('507f1f77bcf86cd799439011');

      expect(apiClient.get).toHaveBeenCalledWith('/conversations/507f1f77bcf86cd799439011');
      expect(result).toEqual(mockConversation);
    });

    it('should throw error for non-existent conversation', async () => {
      const error = new ApiClientError('Conversation not found', 'NOT_FOUND', 404);
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.getById('nonexistent')).rejects.toThrow(ApiClientError);
    });
  });

  describe('create', () => {
    it('should create conversation with valid data', async () => {
      const mockConversation: Partial<Conversation> = {
        id: '507f1f77bcf86cd799439011',
        tags: [],
        technique: 'elenchus',
        title: 'New Conversation',
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockConversation);

      const dto: CreateConversationDto = {
        tags: [],
        technique: 'elenchus',
        title: 'New Conversation',
      };
      const result = await conversationsApi.create(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/conversations', dto);
      expect(result).toEqual(mockConversation);
    });

    it('should create conversation with tags', async () => {
      const mockConversation: Partial<Conversation> = {
        id: '507f1f77bcf86cd799439011',
        tags: ['react', 'performance'],
        technique: 'dialectic',
        title: 'React Performance',
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockConversation);

      const dto: CreateConversationDto = {
        tags: ['react', 'performance'],
        technique: 'dialectic',
        title: 'React Performance',
      };
      await conversationsApi.create(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/conversations', dto);
    });
  });

  describe('update', () => {
    it('should update conversation title', async () => {
      const mockConversation: Partial<Conversation> = {
        id: '507f1f77bcf86cd799439011',
        title: 'Updated Title',
      };
      (apiClient.patch as jest.Mock).mockResolvedValue(mockConversation);

      const dto: UpdateConversationDto = { title: 'Updated Title' };
      const result = await conversationsApi.update('507f1f77bcf86cd799439011', dto);

      expect(apiClient.patch).toHaveBeenCalledWith('/conversations/507f1f77bcf86cd799439011', dto);
      expect(result).toEqual(mockConversation);
    });

    it('should update conversation favorite status', async () => {
      const mockConversation: Partial<Conversation> = {
        id: '507f1f77bcf86cd799439011',
        isFavorite: true,
      };
      (apiClient.patch as jest.Mock).mockResolvedValue(mockConversation);

      const dto: UpdateConversationDto = { isFavorite: true };
      await conversationsApi.update('507f1f77bcf86cd799439011', dto);

      expect(apiClient.patch).toHaveBeenCalledWith('/conversations/507f1f77bcf86cd799439011', dto);
    });

    it('should update multiple fields', async () => {
      const mockConversation: Partial<Conversation> = {
        id: '507f1f77bcf86cd799439011',
        isArchived: true,
        isFavorite: true,
        tags: ['archived'],
        title: 'Archived Conversation',
      };
      (apiClient.patch as jest.Mock).mockResolvedValue(mockConversation);

      const dto: UpdateConversationDto = {
        isArchived: true,
        isFavorite: true,
        tags: ['archived'],
        title: 'Archived Conversation',
      };
      await conversationsApi.update('507f1f77bcf86cd799439011', dto);

      expect(apiClient.patch).toHaveBeenCalledWith('/conversations/507f1f77bcf86cd799439011', dto);
    });
  });

  describe('delete', () => {
    it('should delete conversation', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue(undefined);

      await conversationsApi.delete('507f1f77bcf86cd799439011');

      expect(apiClient.delete).toHaveBeenCalledWith('/conversations/507f1f77bcf86cd799439011');
    });

    it('should throw error for non-existent conversation', async () => {
      const error = new ApiClientError('Conversation not found', 'NOT_FOUND', 404);
      (apiClient.delete as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.delete('nonexistent')).rejects.toThrow(ApiClientError);
    });
  });

  describe('sendMessage', () => {
    it('should send message to conversation', async () => {
      const mockResponse: SendMessageResponse = {
        jobId: 'job-123',
        position: 1,
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const dto = { content: 'What is the best way to optimize React rendering?' };
      const result = await conversationsApi.sendMessage('507f1f77bcf86cd799439011', dto);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/conversations/507f1f77bcf86cd799439011/messages',
        dto
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle rate limit error', async () => {
      const error = new ApiClientError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
        retryAfter: 60,
      });
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(
        conversationsApi.sendMessage('507f1f77bcf86cd799439011', { content: 'Test' })
      ).rejects.toThrow(ApiClientError);
    });
  });

  describe('getArchivedMessages', () => {
    it('should fetch archived messages without pagination', async () => {
      const mockMessages: Message[] = [
        {
          content: 'Old message',
          role: 'user',
          sequence: 1,
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];
      (apiClient.get as jest.Mock).mockResolvedValue(mockMessages);

      const result = await conversationsApi.getArchivedMessages('507f1f77bcf86cd799439011');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/conversations/507f1f77bcf86cd799439011/messages/archived'
      );
      expect(result).toEqual(mockMessages);
    });

    it('should fetch archived messages with limit', async () => {
      const mockMessages: Message[] = [];
      (apiClient.get as jest.Mock).mockResolvedValue(mockMessages);

      await conversationsApi.getArchivedMessages('507f1f77bcf86cd799439011', { limit: 50 });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/conversations/507f1f77bcf86cd799439011/messages/archived?limit=50'
      );
    });

    it('should fetch archived messages with pagination', async () => {
      const mockMessages: Message[] = [];
      (apiClient.get as jest.Mock).mockResolvedValue(mockMessages);

      await conversationsApi.getArchivedMessages('507f1f77bcf86cd799439011', {
        beforeSequence: 100,
        limit: 50,
      });

      const call = (apiClient.get as jest.Mock).mock.calls[0][0];
      expect(call).toContain('limit=50');
      expect(call).toContain('beforeSequence=100');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      const error = new ApiClientError('Network error', 'NETWORK_ERROR', 0);
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.getAll()).rejects.toThrow(ApiClientError);
      await expect(conversationsApi.getAll()).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        status: 0,
      });
    });

    it('should handle unauthorized errors', async () => {
      const error = new ApiClientError('Unauthorized', 'UNAUTHORIZED', 401);
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.getById('123')).rejects.toThrow(ApiClientError);
      await expect(conversationsApi.getById('123')).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
    });

    it('should handle forbidden errors', async () => {
      const error = new ApiClientError('Forbidden', 'FORBIDDEN', 403);
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.getById('123')).rejects.toThrow(ApiClientError);
      await expect(conversationsApi.getById('123')).rejects.toMatchObject({
        code: 'FORBIDDEN',
        status: 403,
      });
    });

    it('should handle server errors', async () => {
      const error = new ApiClientError('Internal server error', 'SERVER_ERROR', 500);
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.getAll()).rejects.toThrow(ApiClientError);
      await expect(conversationsApi.getAll()).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        status: 500,
      });
    });

    it('should handle validation errors with details', async () => {
      const error = new ApiClientError('Validation failed', 'VALIDATION_ERROR', 400, {
        fields: { title: 'Title is required' },
      });
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(conversationsApi.create({ technique: 'elenchus', title: '' })).rejects.toThrow(
        ApiClientError
      );

      try {
        await conversationsApi.create({ technique: 'elenchus', title: '' });
      } catch (e) {
        if (e instanceof ApiClientError) {
          expect(e.details).toBeDefined();
          expect(e.details).toHaveProperty('fields');
        }
      }
    });
  });
});
