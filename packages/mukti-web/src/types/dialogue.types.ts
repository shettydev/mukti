/**
 * Dialogue type definitions for frontend
 * Based on dialogue DTOs from backend
 */

import type { HelpControl, HelpLevel, TurnBudgetStatus, TurnKind } from '@muktiai/contracts';

/**
 * Processing complete event, with the help state after the turn
 */
export interface DialogueCompleteEvent extends BaseDialogueStreamEvent {
  data: {
    /** The turn budget after this exchange, or null when there is none. */
    budget?: null | TurnBudgetStatus;
    conclusionReady?: boolean;
    cost: number;
    jobId: string;
    latency: number;
    /** The help level the dialogue is stored at after this turn. */
    scaffoldLevel?: HelpLevel;
    tokens: number;
    turnKind?: TurnKind;
  };
  type: 'complete';
}

/**
 * Error occurred event
 */
export interface DialogueErrorEvent extends BaseDialogueStreamEvent {
  data: {
    code: string;
    message: string;
    retriable: boolean;
  };
  type: 'error';
}

/**
 * Single message in a node dialogue
 * @property content - The message content
 * @property dialogueId - Parent dialogue ID
 * @property id - Message ID
 * @property metadata - Optional metadata for AI-generated messages
 * @property role - Role of the message sender (user or assistant)
 * @property sequence - Sequence number for ordering
 * @property timestamp - Message timestamp
 */
export interface DialogueMessage {
  content: string;
  dialogueId: string;
  id: string;
  metadata?: DialogueMessageMetadata;
  role: DialogueRole;
  sequence: number;
  timestamp: string;
}

/**
 * New message received event
 */
export interface DialogueMessageEvent extends BaseDialogueStreamEvent {
  data: {
    content: string;
    role: DialogueRole;
    sequence: number;
    timestamp: string;
    tokens?: number;
    /** On assistant replies: what kind of reply it is. */
    turnKind?: TurnKind;
  };
  type: 'message';
}

/**
 * Metadata for AI-generated messages
 * @property latencyMs - Time taken to generate the response in milliseconds
 * @property model - AI model used for generation
 * @property tokens - Token count for the message
 */
export interface DialogueMessageMetadata {
  latencyMs?: number;
  model?: string;
  tokens?: number;
  /** What kind of reply this is (absent means ordinary). */
  turnKind?: TurnKind;
}

/**
 * Pagination metadata for messages
 * @property hasMore - Whether there are more messages to load
 * @property limit - Number of items per page
 * @property page - Current page number
 * @property total - Total number of messages
 * @property totalPages - Total number of pages
 */
export interface DialoguePagination {
  hasMore: boolean;
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

/**
 * Processing started event
 */
export interface DialogueProcessingEvent extends BaseDialogueStreamEvent {
  data: {
    jobId: string;
    status: 'started';
  };
  type: 'processing';
}

/**
 * Progress update event
 */
export interface DialogueProgressEvent extends BaseDialogueStreamEvent {
  data: {
    jobId: string;
    position?: number;
    status: string;
  };
  type: 'progress';
}

/**
 * Message role in dialogue
 */
export type DialogueRole = 'assistant' | 'user';

// ============================================================================
// SSE Event Types
// ============================================================================

/**
 * Union type of all dialogue stream events
 */
export type DialogueStreamEvent =
  | DialogueCompleteEvent
  | DialogueErrorEvent
  | DialogueMessageEvent
  | DialogueProcessingEvent
  | DialogueProgressEvent;

/**
 * Node dialogue information
 * @property createdAt - Creation timestamp
 * @property id - Dialogue ID
 * @property lastMessageAt - Timestamp of the last message
 * @property messageCount - Number of messages in this dialogue
 * @property nodeId - Node identifier (e.g., 'seed', 'soil-0', 'root-1')
 * @property nodeLabel - Node content/label
 * @property nodeType - Type of node (seed, soil, root, insight)
 * @property sessionId - Parent canvas session ID
 * @property currentScaffoldLevel - Current help level, 0 to 4
 * @property turnBudget - Turn budget in exchanges, or null for none
 */
export interface NodeDialogue {
  createdAt: string;
  currentScaffoldLevel?: number;
  id: string;
  lastMessageAt?: string;
  messageCount: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
  sessionId: string;
  turnBudget?: null | number;
}

/**
 * Node type for dialogue context
 */
export type NodeType = 'insight' | 'root' | 'seed' | 'soil';

/**
 * Paginated messages response
 * @property dialogue - Dialogue information
 * @property messages - Array of dialogue messages
 * @property pagination - Pagination metadata
 */
export interface PaginatedMessagesResponse {
  /** Null until the node has a dialogue (no message sent, no budget set). */
  dialogue: NodeDialogue | null;
  messages: DialogueMessage[];
  pagination: DialoguePagination;
}

/**
 * Response from sending a message (queue-based)
 * @property jobId - Job ID for tracking the request
 * @property position - Position in the queue
 */
export interface SendMessageResponse {
  jobId: string;
  position: number;
}

/**
 * DTO for sending a message in a node dialogue
 * @property content - The message content to send (1-5000 characters)
 */
export interface SendNodeMessageDto {
  content: string;
  /** At most one learner help control for this message. */
  helpControl?: HelpControl;
  model?: string;
}

/**
 * DTO for updating a node dialogue's settings
 * @property turnBudget - Turn budget in exchanges (1-50); null clears it
 */
export interface UpdateNodeDialogueDto {
  turnBudget?: null | number;
}

/**
 * Base structure for all dialogue SSE events
 */
interface BaseDialogueStreamEvent {
  dialogueId: string;
  nodeId: string;
  sessionId: string;
  timestamp: string;
  type: string;
}
