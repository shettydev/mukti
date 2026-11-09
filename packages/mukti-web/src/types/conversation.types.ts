/**
 * Conversation type definitions for frontend
 * Based on conversation DTOs from backend
 */

import type { HelpControl, TurnKind } from '@muktiai/contracts';

/**
 * Full conversation object
 */
export interface Conversation {
  /** True once the conversation has had a wrap-up (analytics only; never gates Wrap up). */
  conclusionOffered?: boolean;
  conclusionReady?: boolean;
  createdAt: string;
  /** Current help level, 0 (questions only) to 4 (brief explanations). */
  currentScaffoldLevel?: number;
  hasArchivedMessages: boolean;
  id: string;
  isArchived: boolean;
  isFavorite: boolean;
  metadata: ConversationMetadata;
  recentMessages: Message[];
  tags: string[];
  technique: SocraticTechnique;
  title: string;
  totalMessageCount?: number;
  /** Turn budget in exchanges, or null for none. */
  turnBudget?: null | number;
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
  /** On assistant replies: what kind of reply it is (absent means ordinary). */
  turnKind?: TurnKind;
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
  /** At most one learner help control for this message. */
  helpControl?: HelpControl;
  model?: string;
  /** @deprecated Send `helpControl: 'wrap_up'`. */
  wrapUpRequested?: boolean;
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
  /** Turn budget in exchanges (1-50); null clears it. */
  turnBudget?: null | number;
}
