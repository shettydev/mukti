import { Injectable, Logger } from '@nestjs/common';

import {
  ResponseQuality,
  ScaffoldLevel,
  TransitionResult,
} from '../interfaces/scaffolding.interface';

/**
 * Configuration for scaffold level transitions.
 * Based on RFC-0002 fading rules.
 */
export const FADE_CONFIG = {
  /** Number of consecutive failures required to escalate (increase) support */
  FAILURES_TO_ESCALATE: 2,
  /** Maximum level (cannot escalate above this) */
  MAX_LEVEL: ScaffoldLevel.DIRECT_INSTRUCTION,
  /** Minimum level (cannot fade below this) */
  MIN_LEVEL: ScaffoldLevel.PURE_SOCRATIC,
  /** Number of consecutive successes required to fade (reduce) support */
  SUCCESSES_TO_FADE: 2,
} as const;

/**
 * State tracking for fade transitions.
 */
export interface FadeState {
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  currentLevel: ScaffoldLevel;
  lastTransition?: Date;
  transitionHistory: {
    from: ScaffoldLevel;
    reason: string;
    timestamp: Date;
    to: ScaffoldLevel;
  }[];
}

/**
 * Scaffold Fade Service - RFC-0002
 *
 * Manages scaffold level transitions based on user performance.
 * Implements the "2-success fading" and "2-failure escalation" rules
 * from the RFC.
 *
 * Key behaviors:
 * - After 2 consecutive successes: decrease scaffold level (fade support)
 * - After 2 consecutive failures: increase scaffold level (add support)
 * - Success resets failure counter (and vice versa)
 * - Cannot go below Level 0 or above Level 4
 *
 * @remarks
 * The goal is to dynamically adjust support to keep the learner in
 * the "zone of proximal development" - challenged but not overwhelmed.
 */
@Injectable()
export class ScaffoldFadeService {
  private readonly logger = new Logger(ScaffoldFadeService.name);

  /**
   * Calculate fading progress toward a goal level.
   * Useful for showing user their progress toward independence.
   *
   * @param state - Current fade state
   * @param goalLevel - Target level (usually PURE_SOCRATIC)
   * @returns Progress percentage (0-100)
   */
  calculateProgress(
    state: FadeState,
    goalLevel: ScaffoldLevel = ScaffoldLevel.PURE_SOCRATIC,
  ): number {
    if (state.currentLevel <= goalLevel) {
      return 100;
    }

    const levelsToGoal = state.currentLevel - goalLevel;
    const maxLevels = FADE_CONFIG.MAX_LEVEL - goalLevel;

    // Base progress from current level
    const levelProgress = ((maxLevels - levelsToGoal) / maxLevels) * 100;

    // Bonus for consecutive successes (working toward next fade)
    const successBonus =
      (state.consecutiveSuccesses / FADE_CONFIG.SUCCESSES_TO_FADE) *
      (100 / maxLevels);

    return Math.min(levelProgress + successBonus, 100);
  }

  /**
   * Create initial fade state for a new dialogue.
   *
   * @param initialLevel - Starting scaffold level (usually from gap detection)
   * @returns Fresh fade state
   */
  createInitialState(initialLevel: ScaffoldLevel): FadeState {
    return {
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      currentLevel: initialLevel,
      transitionHistory: [],
    };
  }

  /**
   * Get human-readable description of current fade state.
   *
   * @param state - Current fade state
   * @returns Description string
   */
  describeState(state: FadeState): string {
    const levelName = ScaffoldLevel[state.currentLevel];
    const parts: string[] = [`Currently at ${levelName} level`];

    if (state.consecutiveSuccesses > 0) {
      const remaining =
        FADE_CONFIG.SUCCESSES_TO_FADE - state.consecutiveSuccesses;
      parts.push(
        `${remaining} more success${remaining === 1 ? '' : 'es'} to fade support`,
      );
    }

    if (state.consecutiveFailures > 0) {
      const remaining =
        FADE_CONFIG.FAILURES_TO_ESCALATE - state.consecutiveFailures;
      parts.push(
        `${remaining} more struggle${remaining === 1 ? '' : 's'} before more support`,
      );
    }

    return parts.join('. ') + '.';
  }

  /**
   * Evaluate response quality and determine if a level transition is needed.
   *
   * @param state - Current fade state with level and counters
   * @param quality - Evaluation of the user's response quality
   * @returns Transition result with new level and reason
   */
  evaluateAndTransition(
    state: FadeState,
    quality: ResponseQuality,
  ): TransitionResult {
    const { consecutiveFailures, consecutiveSuccesses, currentLevel } = state;

    // Determine if this response was successful
    const isSuccess = this.isSuccessfulResponse(quality);

    // Update counters
    let newSuccesses = isSuccess ? consecutiveSuccesses + 1 : 0;
    let newFailures = isSuccess ? 0 : consecutiveFailures + 1;

    // Determine transition
    let newLevel = currentLevel;
    let changed = false;
    let reason = 'No change needed';

    // Check for fading (2 successes = decrease level)
    if (newSuccesses >= FADE_CONFIG.SUCCESSES_TO_FADE) {
      if (currentLevel > FADE_CONFIG.MIN_LEVEL) {
        newLevel = currentLevel - 1;
        changed = true;
        reason = `${FADE_CONFIG.SUCCESSES_TO_FADE} consecutive successes - fading support`;
        newSuccesses = 0; // Reset after transition
        this.logger.log(
          `Fading scaffold: ${ScaffoldLevel[currentLevel]} -> ${ScaffoldLevel[newLevel]}`,
        );
      } else {
        reason = 'At minimum level - cannot fade further';
        newSuccesses = 0; // Reset counter even at min level
      }
    }

    // Check for escalation (2 failures = increase level)
    if (newFailures >= FADE_CONFIG.FAILURES_TO_ESCALATE) {
      if (currentLevel < FADE_CONFIG.MAX_LEVEL) {
        newLevel = currentLevel + 1;
        changed = true;
        reason = `${FADE_CONFIG.FAILURES_TO_ESCALATE} consecutive failures - increasing support`;
        newFailures = 0; // Reset after transition
        this.logger.log(
          `Escalating scaffold: ${ScaffoldLevel[currentLevel]} -> ${ScaffoldLevel[newLevel]}`,
        );
      } else {
        reason = 'At maximum level - cannot escalate further';
        newFailures = 0; // Reset counter even at max level
      }
    }

    return {
      changed,
      newLevel,
      reason,
    };
  }

  /**
   * Force a level change (for manual intervention or special cases).
   *
   * @param state - Current state
   * @param newLevel - Level to set
   * @param reason - Reason for manual change
   * @returns Updated state
   */
  forceLevel(
    state: FadeState,
    newLevel: ScaffoldLevel,
    reason: string,
  ): FadeState {
    this.logger.log(
      `Forcing scaffold level: ${ScaffoldLevel[state.currentLevel]} -> ${ScaffoldLevel[newLevel]} (${reason})`,
    );

    return {
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      currentLevel: newLevel,
      lastTransition: new Date(),
      transitionHistory: [
        ...state.transitionHistory,
        {
          from: state.currentLevel,
          reason: `Manual: ${reason}`,
          timestamp: new Date(),
          to: newLevel,
        },
      ],
    };
  }

  /**
   * Update fade state after a transition.
   *
   * @param state - Current state
   * @param transition - Transition result
   * @param newSuccesses - Updated success counter
   * @param newFailures - Updated failure counter
   * @returns Updated fade state
   */
  updateState(
    state: FadeState,
    transition: TransitionResult,
    newSuccesses: number,
    newFailures: number,
  ): FadeState {
    const updatedState: FadeState = {
      consecutiveFailures: newFailures,
      consecutiveSuccesses: newSuccesses,
      currentLevel: transition.newLevel,
      lastTransition: transition.changed ? new Date() : state.lastTransition,
      transitionHistory: [...state.transitionHistory],
    };

    // Record transition in history if level changed
    if (transition.changed) {
      updatedState.transitionHistory.push({
        from: state.currentLevel,
        reason: transition.reason,
        timestamp: new Date(),
        to: transition.newLevel,
      });
    }

    return updatedState;
  }

  /**
   * Determine if a response quality indicates success.
   *
   * @param quality - Response quality evaluation
   * @returns True if the response demonstrates understanding
   */
  private isSuccessfulResponse(quality: ResponseQuality): boolean {
    // Primary check: demonstrates understanding flag
    if (quality.demonstratesUnderstanding) {
      return true;
    }

    // Secondary check: confidence threshold
    if (quality.confidence >= 0.7) {
      return true;
    }

    // Tertiary check: signal combination
    const { signals } = quality;
    const positiveSignals = [
      signals.hasExplanation,
      signals.mentionsConcept,
      signals.appliesPattern,
      signals.asksRelevantQuestion,
    ].filter(Boolean).length;

    return positiveSignals >= 3;
  }
}
