/**
 * TypeScript types for the Thought Map feature
 *
 * Matches the RFC-0003 data models exactly.
 * Thought Maps are mind-map style structures for exploring a central topic
 * through branching thought nodes arranged in a radial tree layout.
 */

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Request body for POST /thought-maps/convert-from-canvas/:sessionId
 */
export interface ConvertCanvasRequest {
  /** Optional title override — defaults to the canvas seed text */
  title?: string;
}

/**
 * DTO for creating a new Thought Map
 */
export interface CreateThoughtMapRequest {
  /** The central topic / title for the map */
  title: string;
}

/**
 * DTO for creating a new node in a Thought Map
 */
export interface CreateThoughtNodeRequest {
  /** Whether this node is promoted from an AI suggestion */
  fromSuggestion?: boolean;
  /** Display text for the new node */
  label: string;
  /** The thought map to add the node to */
  mapId: string;
  /** nodeId of the parent node */
  parentNodeId: string;
  /** Optional explicit node type; defaults to "thought" when omitted */
  type?: Extract<ThoughtMapNodeType, 'insight' | 'question' | 'thought' | 'topic'>;
  /** Initial x position (will be recalculated by layout if 0) */
  x?: number;
  /** Initial y position (will be recalculated by layout if 0) */
  y?: number;
}

/**
 * Request body for POST /thought-maps/extract
 */
export interface ExtractConversationRequest {
  /** ID of the conversation to extract a map from */
  conversationId: string;
  /** Optional model override */
  model?: string;
}

/**
 * Response from POST /thought-maps/extract (202 Accepted)
 */
export interface ExtractionJobResponse {
  jobId: string;
  position: number;
}

/**
 * Union of all extraction SSE event payloads.
 *
 * SSE sequence: processing → preview → complete | error
 */
export type ExtractionStreamEvent =
  | {
      /** Full draft ThoughtMap + nodes ready for client review */
      data: ThoughtMapWithNodes;
      type: 'preview';
    }
  | {
      data: { code: string; message: string; retriable: boolean };
      type: 'error';
    }
  | {
      data: { jobId: string; mapId: string; nodeCount: number };
      type: 'complete';
    }
  | {
      data: { jobId: string; status: 'started' };
      type: 'processing';
    };

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Thinking intent selected by the user when creating a new Thought Map.
 * Frontend-only for now — used to customize placeholder text.
 * Future: adapt AI suggestion prompts by intent.
 */
export type ThinkingIntent = 'debug' | 'decide' | 'explore' | 'understand';

// ============================================================================
// Enums
// ============================================================================

/**
 * A Thought Map — the top-level container
 *
 * @property id - Unique identifier (transformed from MongoDB _id)
 * @property userId - Owner of the thought map
 * @property title - Human-readable title for the map
 * @property status - Lifecycle status
 * @property settings - User-configurable display/behaviour settings
 * @property nodeCount - Denormalized count of nodes (for list views)
 * @property createdAt - ISO timestamp of creation
 * @property updatedAt - ISO timestamp of last update
 */
export interface ThoughtMap {
  createdAt: string;
  id: string;
  nodeCount: number;
  rootNodeId: string;
  settings: ThoughtMapSettings;
  sourceCanvasSessionId?: string;
  sourceConversationId?: string;
  status: ThoughtMapStatus;
  title: string;
  updatedAt: string;
  userId: string;
}

// ============================================================================
// Settings
// ============================================================================

/**
 * A Thought Map node dialogue record — created when the user first opens
 * the dialogue panel for a node.
 */
export interface ThoughtMapDialogue {
  createdAt: string;
  id: string;
  lastMessageAt?: string;
  mapId: string;
  messageCount: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

/**
 * A single message in a Thought Map node dialogue.
 */
export interface ThoughtMapDialogueMessage {
  content: string;
  dialogueId: string;
  id: string;
  metadata?: {
    latencyMs?: number;
    model?: string;
    tokens?: number;
  };
  role: 'assistant' | 'user';
  sequence: number;
  timestamp: string;
}

/**
 * A single node within a Thought Map
 *
 * @property id - Unique identifier (transformed from MongoDB _id)
 * @property mapId - Parent Thought Map ID
 * @property nodeId - Stable node identifier used for layout and edges (e.g. "topic", "branch-0")
 * @property parentNodeId - nodeId of the parent node, or null for the topic node
 * @property type - Node type (topic | branch | leaf)
 * @property label - Display text for the node
 * @property depth - Distance from topic node (0 = topic, 1 = branch, 2+ = leaf)
 * @property isExplored - Whether the node has been explored via Socratic dialogue
 * @property position - Stored x/y position (may be overridden by layout algorithm)
 * @property createdAt - ISO timestamp of creation
 * @property updatedAt - ISO timestamp of last update
 */
export interface ThoughtMapNode {
  createdAt: string;
  depth: number;
  fromSuggestion: boolean;
  id: string;
  isCollapsed: boolean;
  isExplored: boolean;
  label: string;
  mapId: string;
  messageCount: number;
  nodeId: string;
  parentNodeId: null | string;
  position: { x: number; y: number };
  sourceMessageIndices?: number[];
  type: ThoughtMapNodeType;
  updatedAt: string;
}

/**
 * Node types in a Thought Map
 * - topic:    The central root node (depth 0), always at (0,0)
 * - branch:   First-level child nodes (depth 1), split left/right hemispheres
 * - leaf:     Deeper-level nodes (depth 2+), extending from their branch ancestor
 * - thought:  Generic thought node (backend alias, maps to thought-node renderer)
 * - question: AI-suggested question node (ghost state before acceptance)
 * - insight:  Insight node derived from conversation
 */
export type ThoughtMapNodeType = 'branch' | 'insight' | 'leaf' | 'question' | 'thought' | 'topic';

// ============================================================================
// Request DTOs (continued)
// ============================================================================

/**
 * Paginated response for Thought Map dialogue messages.
 */
export interface ThoughtMapPaginatedMessagesResponse {
  dialogue: null | ThoughtMapDialogue;
  messages: ThoughtMapDialogueMessage[];
  pagination: {
    hasMore: boolean;
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Thought Map Dialogue types
// ============================================================================

/**
 * User-configurable settings for a Thought Map
 */
export interface ThoughtMapSettings {
  autoSuggestEnabled: boolean;
  autoSuggestIdleSeconds: number;
  maxSuggestionsPerNode: number;
}

/**
 * A public share link for a Thought Map.
 */
export interface ThoughtMapShareLink {
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  id: string;
  isActive: boolean;
  thoughtMapId: string;
  token: string;
  viewCount: number;
}

/**
 * Async response from starting a new Thought Map node dialogue.
 * The AI initial question is being generated via the queue —
 * subscribe to the SSE stream for the message.
 */
export interface ThoughtMapStartDialogueAsyncResponse {
  dialogue: ThoughtMapDialogue;
  jobId: string;
  position: number;
}

/**
 * Union response from starting a Thought Map node dialogue.
 * - Async (has `jobId`): new dialogue, AI generating initial question via queue
 * - Sync (has `initialQuestion`): existing dialogue, returns first message
 */
export type ThoughtMapStartDialogueResponse =
  | ThoughtMapStartDialogueAsyncResponse
  | ThoughtMapStartDialogueSyncResponse;

/**
 * Sync response when a Thought Map node dialogue already has messages.
 * Returns the first message directly (no queue job needed).
 */
export interface ThoughtMapStartDialogueSyncResponse {
  dialogue: ThoughtMapDialogue;
  initialQuestion: ThoughtMapDialogueMessage;
}

/**
 * Status lifecycle of a Thought Map
 */
export type ThoughtMapStatus = 'active' | 'archived' | 'draft';

/**
 * A Thought Map with its nodes eagerly loaded
 * Used for the canvas view where both map metadata and all nodes are needed
 */
export interface ThoughtMapWithNodes {
  map: ThoughtMap;
  nodes: ThoughtMapNode[];
}

/**
 * Request body for PATCH /thought-maps/:id/settings
 */
export interface UpdateThoughtMapSettingsRequest {
  autoSuggestEnabled?: boolean;
  autoSuggestIdleSeconds?: number;
  maxSuggestionsPerNode?: number;
}

/**
 * DTO for updating an existing Thought Map node
 */
export interface UpdateThoughtNodeRequest {
  /** Mark as explored after Socratic dialogue */
  isExplored?: boolean;
  /** New display text */
  label?: string;
  /** Updated x position */
  x?: number;
  /** Updated y position */
  y?: number;
}

/**
 * Phase 1 canvas presentation type for a node.
 *
 * The backend stores semantic types (`thought`, `question`, `insight`, `topic`),
 * but the tightened Phase 1 UI only needs to distinguish:
 * - the root topic node
 * - first-level branch nodes
 * - deeper leaf nodes
 */
export function getThoughtMapNodeType(depth: number): ThoughtMapNodeType {
  if (depth <= 0) {
    return 'topic';
  }

  return depth === 1 ? 'branch' : 'leaf';
}
