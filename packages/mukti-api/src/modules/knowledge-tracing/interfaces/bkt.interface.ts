/**
 * Bayesian Knowledge Tracing (BKT) Parameter Interface
 *
 * The four core parameters that define the BKT model for a specific concept.
 * These probabilities govern how knowledge states evolve over time as users
 * interact with learning materials.
 */
export interface BKTParameters {
  /**
   * Guess probability (P(G))
   * Range: 0.0 - 0.5 (typically for multiple choice)
   * Default: 0.25 (25% guess rate, e.g., 1/4 for 4-option MCQ)
   *
   * The probability that a user answers correctly despite
   * not knowing the concept (lucky guess).
   */
  pGuess: number;

  /**
   * Initial knowledge probability (P(L0))
   * Range: 0.0 - 1.0
   * Default: 0.3 (30% initial mastery)
   *
   * Represents the probability that a user already knows the concept
   * before any learning interactions.
   */
  pInit: number;

  /**
   * Learning rate (P(T))
   * Range: 0.0 - 1.0
   * Default: 0.15 (15% learning increment per interaction)
   *
   * The probability that a user will learn the concept after
   * each learning opportunity (regardless of correctness).
   */
  pLearn: number;

  /**
   * Slip probability (P(S))
   * Range: 0.0 - 0.3 (typically kept low)
   * Default: 0.1 (10% slip rate)
   *
   * The probability that a user makes an error despite knowing
   * the concept (careless mistake, typo, etc.).
   */
  pSlip: number;
}

/**
 * BKT Update Result Interface
 *
 * Contains both the updated knowledge state and diagnostic information
 * about the Bayesian update process.
 */
export interface BKTUpdateResult {
  /** Whether the user is considered to have "mastered" this concept */
  isMastered: boolean;

  /**
   * The updated probability after applying learning rate
   * P(L_n+1) = P(L_n | obs) + (1 - P(L_n | obs)) * pLearn
   */
  posteriorAfterLearning: number;

  /**
   * The posterior probability after observing the response
   * P(L_n | observation) before applying learning
   */
  posteriorBeforeLearning: number;

  /** Suggested next action based on mastery level */
  recommendation: 'advance' | 'practice' | 'reassess' | 'review';

  /** The updated knowledge state after applying BKT */
  state: KnowledgeState;
}

/**
 * Knowledge State Interface
 *
 * Represents a user's current knowledge state for a specific concept.
 * Updated incrementally as the user interacts with learning materials.
 */
export interface KnowledgeState {
  /** MongoDB ObjectId or UUID for the knowledge state record */
  _id?: string;

  /** Total number of attempts (correct + incorrect) */
  attempts: number;

  /** ID of the concept being tracked (e.g., "algebra_linear_equations") */
  conceptId: string;

  /** Number of correct attempts */
  correctAttempts: number;

  /** Timestamp of when this knowledge state was first created */
  createdAt?: Date;

  /**
   * Current knowledge probability P(L_n)
   * Range: 0.0 - 1.0
   *
   * The posterior probability that the user has mastered this concept
   * after n learning interactions.
   */
  currentProbability: number;

  /** Timestamp of last knowledge state update */
  lastAssessed: Date;

  /** BKT parameters used for this concept */
  parameters: BKTParameters;

  /** Timestamp of last update */
  updatedAt?: Date;

  /** ID of the user whose knowledge is being tracked */
  userId: string;
}

/**
 * Default BKT parameters based on research literature
 * Source: pyBKT (Stanford CAHLR), Corbett & Anderson (1995)
 */
export const DEFAULT_BKT_PARAMS: BKTParameters = {
  pGuess: 0.25, // 25% guess probability (4-option MCQ)
  pInit: 0.3, // 30% initial knowledge
  pLearn: 0.15, // 15% learning rate per interaction
  pSlip: 0.1, // 10% slip probability
};

/**
 * Mastery threshold constants
 */
export const MASTERY_THRESHOLD = 0.95; // 95% knowledge probability = mastery
export const STRUGGLING_THRESHOLD = 0.4; // Below 40% = needs intervention
