/**
 * Conversation type definitions for frontend
 * Based on conversation DTOs from backend
 */

/**
 * Full conversation object
 */
export interface Conversation {
  createdAt: string;
  hasArchivedMessages: boolean;
  id: string;
  isArchived: boolean;
  isFavorite: boolean;
  metadata: ConversationMetadata;
  recentMessages: Message[];
  tags: string[];
  technique: SocraticTechnique;
  title: string;
  updatedAt: string;
  userId: string;
}

/**
 * Conversation filters
 */
export interface ConversationFilters {
  isArchived?: boolean;
  isFavorite?: boolean;
  limit?: number;
  page?: number;
  sort?: 'createdAt' | 'lastMessageAt' | 'updatedAt';
  tags?: string[];
  technique?: SocraticTechnique;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  estimatedCost: number;
  lastMessageAt?: string;
  messageCount: number;
  totalTokens: number;
}

/**
 * Create conversation DTO
 */
export interface CreateConversationDto {
  tags?: string[];
  technique: SocraticTechnique;
  title: string;
}

/**
 * Message in a conversation
 */
export interface Message {
  content: string;
  role: MessageRole;
  sequence: number;
  timestamp: string;
  tokens?: number;
}

/**
 * Message role
 */
export type MessageRole = 'assistant' | 'user';

/**
 * Paginated conversation response
 */
export interface PaginatedConversations {
  data: Conversation[];
  meta: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Rate limit error details
 */
export interface RateLimitError {
  code: 'RATE_LIMIT_EXCEEDED';
  message: string;
  retryAfter: number; // seconds
}

/**
 * Send message DTO
 */
export interface SendMessageDto {
  content: string;
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  jobId: string;
  position: number;
}

/**
 * Socratic questioning technique
 */
export type SocraticTechnique =
  | 'analogical'
  | 'counterfactual'
  | 'definitional'
  | 'dialectic'
  | 'elenchus'
  | 'maieutics';

/**
 * Update conversation DTO
 */
export interface UpdateConversationDto {
  isArchived?: boolean;
  isFavorite?: boolean;
  tags?: string[];
  technique?: SocraticTechnique;
  title?: string;
}
