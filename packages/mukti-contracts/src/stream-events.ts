/**
 * Wire contract for live (SSE) stream events, shared by the API and the web.
 *
 * @remarks
 * This file is the single source of truth for what the API emits on its
 * conversation and node-dialogue streams. It is type-only and imports
 * nothing, so the web app can import it across the package boundary
 * (`import type`) without pulling in Nest or Mongoose. The web compiles a
 * check against it (`mukti-web/src/types/stream-contract.check.ts`), so a
 * change here that the client does not follow fails `tsc` in the web
 * package instead of failing silently in the browser.
 *
 * Keep it dependency-free.
 */

/** Envelope on chat conversation events (`/conversations/:id/stream`). */
export interface ConversationStreamEnvelope {
  conversationId: string;
}

/** Any chat conversation stream event. */
export type ConversationStreamEventContract = {
  [T in StreamEventType]: StreamEventOf<T, ConversationStreamEnvelope>;
}[StreamEventType];

/**
 * Envelope on canvas and thought-map node-dialogue events. For thought maps
 * `sessionId` is `map:{mapId}`.
 */
export interface NodeDialogueStreamEnvelope {
  dialogueId: string;
  nodeId: string;
  sessionId: string;
}

/** Any canvas or thought-map node-dialogue stream event. */
export type NodeDialogueStreamEventContract = {
  [T in StreamEventType]: StreamEventOf<T, NodeDialogueStreamEnvelope>;
}[StreamEventType];

// ---------------------------------------------------------------------------
// Thought-map job streams. These carry no envelope fields and have their own
// event sets, so they are listed out rather than built from the map above.
// ---------------------------------------------------------------------------

/** One AI-suggested branch (`/thought-maps/:id/suggest/stream`). */
export interface BranchSuggestionPayload {
  /** Always phrased as a question. */
  label: string;
  /** nodeId of the parent the branch would grow from. */
  parentId: string;
  suggestedType: 'question' | 'thought';
}

/** Branch-suggestion stream: `processing → suggestion* → complete | error`. */
export type SuggestionStreamEventContract =
  | { data: BranchSuggestionPayload; type: 'suggestion' }
  | { data: StreamEventPayloads['error']; type: 'error' }
  | { data: StreamEventPayloads['processing']; type: 'processing' }
  | { data: { jobId: string; suggestionCount: number }; type: 'complete' };

/**
 * Conversation-to-map extraction stream:
 * `processing → preview → complete | error`.
 *
 * @typeParam Preview - The draft map payload. The API sends stored documents
 * (`_id`, `parentId`) and the web reshapes them, so each side supplies its own
 * type here; the contract pins the event set and every other payload.
 */
export type ExtractionStreamEventContract<Preview = unknown> =
  | { data: Preview; type: 'preview' }
  | { data: StreamEventPayloads['error']; type: 'error' }
  | { data: StreamEventPayloads['processing']; type: 'processing' }
  | {
      data: { jobId: string; mapId: string; nodeCount: number };
      type: 'complete';
    };

// ---------------------------------------------------------------------------
// Learner help controls (dialogue-help-controls). Shared by chat, canvas node
// dialogue and thought-map node dialogue.
// ---------------------------------------------------------------------------

/**
 * A control the learner attaches to one message. At most one per message.
 *
 * - `more_help`: write the reply one help level higher, straight away.
 * - `explain`: explain the one missing piece, for this reply only.
 * - `wrap_up`: reply with a closing summary.
 */
export type HelpControl = 'explain' | 'more_help' | 'wrap_up';

/**
 * How much support a dialogue gives: 0 "Questions only", 1 "Thinking
 * prompts", 2 "Hints", 3 "Examples", 4 "Brief explanations".
 */
export type HelpLevel = 0 | 1 | 2 | 3 | 4;

/** Where a dialogue stands against the turn budget the learner set. */
export interface TurnBudgetStatus {
  /** The budget, in exchanges (one user message and its reply). */
  limit: number;
  /** Exchanges so far, including the one that just finished. */
  used: number;
}

/**
 * What kind of reply a turn produced, after the turn budget is applied: the
 * learner's control, or `ordinary`. The turn that reaches the budget is
 * always `wrap_up`.
 */
export type TurnKind = 'ordinary' | HelpControl;

/** One event of type `T`, with the envelope fields a stream adds. */
export type StreamEventOf<T extends StreamEventType, Envelope> = Envelope & {
  data: StreamEventPayloads[T];
  timestamp: string;
  type: T;
};

/** Payload of each event type, common to every stream. */
export interface StreamEventPayloads {
  complete: {
    /**
     * The dialogue's turn budget after this exchange, or null when it has
     * none. Absent on completions that are not a learner turn (a thought-map
     * node's opening question).
     */
    budget?: null | TurnBudgetStatus;
    /** The dialogue has reached a conclusion the learner could accept. */
    conclusionReady?: boolean;
    cost: number;
    jobId: string;
    latency: number;
    /**
     * The help level the dialogue is stored at after this turn settled, which
     * the help-level indicator shows. Absent on completions that are not a
     * learner turn.
     */
    scaffoldLevel?: HelpLevel;
    tokens: number;
    /** What kind of reply this turn produced. Absent outside learner turns. */
    turnKind?: TurnKind;
  };
  error: {
    code: string;
    details?: Record<string, unknown>;
    message: string;
    retriable: boolean;
  };
  message: {
    content: string;
    role: 'assistant' | 'user';
    sequence: number;
    timestamp: string;
    tokens?: number;
    /**
     * On an assistant reply to a learner turn: what kind of reply it is, so
     * the client can tag explanations and summaries.
     */
    turnKind?: TurnKind;
  };
  processing: {
    jobId: string;
    status: 'started';
  };
  progress: {
    jobId: string;
    position?: number;
    status: string;
  };
}

/** Event types every live stream may carry, in emission order. */
export type StreamEventType = 'complete' | 'error' | 'message' | 'processing' | 'progress';
