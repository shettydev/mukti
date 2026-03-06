/**
 * Scaffold Level Enum - RFC-0002 Adaptive Scaffolding Framework
 *
 * Defines the 5 levels of support provided to users based on their
 * knowledge gap severity.
 */
export enum ScaffoldLevel {
  /** Direct instruction - brief concept explanation + guided practice */
  DIRECT_INSTRUCTION = 4,
  /** Meta-cognitive prompts - "What strategy are you using?" */
  META_COGNITIVE = 1,
  /** Pure Socratic questioning - no hints, assumes latent knowledge */
  PURE_SOCRATIC = 0,
  /** Strategic hints - problem decomposition, chunking */
  STRATEGIC_HINTS = 2,
  /** Worked examples - analogies, partial solutions */
  WORKED_EXAMPLES = 3,
}

/**
 * Gap Score Thresholds - RFC-0001
 * Used to determine scaffold level from gap score.
 */
export const GAP_SCORE_THRESHOLDS = {
  META_COGNITIVE_MAX: 0.5,
  PURE_SOCRATIC_MAX: 0.3,
  STRATEGIC_HINTS_MAX: 0.7,
  WORKED_EXAMPLES_MAX: 0.85,
  // Above 0.85 = DIRECT_INSTRUCTION
} as const;

/**
 * Linguistic markers indicating knowledge gaps.
 * From RFC-0001, MCP server patterns.
 */
export const KNOWLEDGE_GAP_MARKERS = [
  "don't know",
  'no idea',
  'never heard of',
  'what is',
  'clueless',
  'no clue',
  'unfamiliar',
  'not sure what',
] as const;

/**
 * Linguistic markers indicating confusion.
 */
export const CONFUSION_MARKERS = [
  "don't understand",
  'unclear',
  'confusing',
  'lost',
  'makes no sense',
  'over my head',
  "can't figure out",
  "doesn't make sense",
] as const;

/**
 * Linguistic markers indicating frustration.
 */
export const FRUSTRATION_MARKERS = [
  'frustrated',
  'stuck',
  'giving up',
  'already told you',
  'just tell me',
  'stop asking',
  "i don't care",
  'this is impossible',
] as const;

/**
 * Input for gap detection analysis.
 */
export interface GapDetectionInput {
  /** OpenRouter API key for LLM concept extraction fallback */
  aiApiKey?: string;
  /** AI model to use for concept extraction (defaults to dialogue model) */
  aiModel?: string;
  /** Concepts detected in the current context */
  conceptContext?: string[];
  /** Recent conversation history */
  conversationHistory: {
    content: string;
    role: 'assistant' | 'user';
    timestamp?: Date;
  }[];
  /** Previous response lengths for degradation detection */
  previousResponseLengths?: number[];
  /** Time spent on current problem (milliseconds) */
  timeOnProblem?: number;
  /** User ID for knowledge state lookup */
  userId: string;
  /** The user's latest message */
  userMessage: string;
}

/**
 * Result of gap detection analysis.
 */
export interface GapDetectionResult {
  /** Detected concepts from the message */
  detectedConcepts: string[];
  /** Overall gap score (0-1, higher = more certain gap exists) */
  gapScore: number;
  /** Current P(L) from BKT for primary concept */
  knowledgeProbability: number;
  /** Missing prerequisites chain */
  missingPrerequisites: string[];
  /** Recommended action */
  recommendation: 'scaffold' | 'socratic' | 'teach';
  /** Root knowledge gap concept ID if found */
  rootGap: null | string;
  /** Determined scaffold level */
  scaffoldLevel: ScaffoldLevel;
  /** Signal breakdown */
  signals: {
    behavioral: number;
    linguistic: number;
    temporal: number;
  };
}

/**
 * Weights for gap score calculation.
 * Sum should equal 1.0
 */
export const GAP_SCORE_WEIGHTS = {
  behavioral: 0.25,
  knowledge: 0.3,
  linguistic: 0.3,
  temporal: 0.15,
} as const;

/**
 * Behavioral signal thresholds.
 */
export const BEHAVIORAL_THRESHOLDS = {
  /** Same concept wrong attempts threshold */
  CONSECUTIVE_FAILURES: 3,
  /** Same question asked multiple times threshold */
  HELP_SEEKING_LOOP: 2,
  /** Response length drop percentage for engagement detection */
  RESPONSE_DEGRADE_THRESHOLD: 0.5,
} as const;

/**
 * Temporal signal thresholds.
 */
export const TEMPORAL_THRESHOLDS = {
  /** Abandonment pattern detection (started, deleted, gave up) */
  ABANDONMENT_THRESHOLD_MS: 30000,
  /** Minutes without progress before flagging */
  TIME_ON_PROBLEM_MINUTES: 15,
} as const;

/**
 * Gap detection signals for emergency escalation.
 */
export interface GapDetectionSignals {
  abandonment: boolean;
  explicitHelpRequest: boolean;
  frustration: number;
}

/**
 * Response quality evaluation result.
 */
export interface ResponseQuality {
  confidence: number;
  demonstratesUnderstanding: boolean;
  signals: {
    appliesPattern: boolean;
    asksRelevantQuestion: boolean;
    hasExplanation: boolean;
    mentionsConcept: boolean;
  };
}

/**
 * Scaffold context for prompt augmentation.
 */
export interface ScaffoldContext {
  conceptContext?: string[];
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  level: ScaffoldLevel;
  rootGap?: string;
}

/**
 * Transition result from fade controller.
 */
export interface TransitionResult {
  changed: boolean;
  newLevel: ScaffoldLevel;
  reason: string;
  /**
   * Whether the consecutive success/failure counters should be reset.
   * True when the level changed OR when a boundary (min/max) was hit and
   * the counters were cleared. Consumers should branch on this flag instead
   * of string-matching `reason` to avoid brittle coupling.
   */
  resetCounters: boolean;
}
