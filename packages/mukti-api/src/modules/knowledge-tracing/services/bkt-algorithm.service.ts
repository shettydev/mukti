import { Injectable, Logger } from '@nestjs/common';

import {
  BKTParameters,
  BKTUpdateResult,
  KnowledgeState,
  MASTERY_THRESHOLD,
  STRUGGLING_THRESHOLD,
} from '../interfaces/bkt.interface';

/**
 * BKT Algorithm Service
 *
 * Implements the core Bayesian Knowledge Tracing algorithm for updating
 * knowledge state probabilities based on user responses.
 *
 * Reference: Corbett, A. T., & Anderson, J. R. (1995).
 * Knowledge tracing: Modeling the acquisition of procedural knowledge.
 * User Modeling and User-Adapted Interaction, 4(4), 253-278.
 *
 * Algorithm:
 * 1. Compute posterior P(L_n | observation) using Bayes' theorem
 * 2. Apply learning rate to get P(L_n+1)
 * 3. Return updated state with diagnostic information
 */
@Injectable()
export class BKTAlgorithmService {
  private readonly logger = new Logger(BKTAlgorithmService.name);

  /**
   * Update knowledge state using BKT based on a user's response.
   *
   * @param currentState - The current knowledge state before this interaction
   * @param correct - Whether the user answered correctly
   * @returns BKTUpdateResult with updated state and diagnostic info
   *
   * @example
   * const result = bktService.updateKnowledgeState(
   *   { currentProbability: 0.5, parameters: DEFAULT_BKT_PARAMS, ... },
   *   true // user answered correctly
   * );
   * console.log(result.posteriorAfterLearning); // New P(L)
   */
  updateKnowledgeState(
    currentState: KnowledgeState,
    correct: boolean,
  ): BKTUpdateResult {
    const { currentProbability: priorL, parameters } = currentState;
    const { pGuess, pLearn, pSlip } = parameters;

    // Step 1: Compute posterior P(L_n | observation) using Bayes' theorem
    const posteriorBeforeLearning = this.computePosterior(
      priorL,
      correct,
      pSlip,
      pGuess,
    );

    // Step 2: Apply learning rate to get P(L_n+1)
    // P(L_n+1) = P(L_n | obs) + (1 - P(L_n | obs)) * P(T)
    const posteriorAfterLearning =
      posteriorBeforeLearning + (1 - posteriorBeforeLearning) * pLearn;

    // Step 3: Update state object
    const updatedState: KnowledgeState = {
      ...currentState,
      attempts: currentState.attempts + 1,
      correctAttempts: correct
        ? currentState.correctAttempts + 1
        : currentState.correctAttempts,
      currentProbability: posteriorAfterLearning,
      lastAssessed: new Date(),
    };

    // Step 4: Determine mastery status and recommendation
    const isMastered = posteriorAfterLearning >= MASTERY_THRESHOLD;
    const recommendation = this.getRecommendation(posteriorAfterLearning);

    this.logger.debug(
      `BKT Update: P(L) ${priorL.toFixed(3)} → ${posteriorAfterLearning.toFixed(3)} ` +
        `(correct: ${correct}, mastered: ${isMastered})`,
    );

    return {
      isMastered,
      posteriorAfterLearning,
      posteriorBeforeLearning,
      recommendation,
      state: updatedState,
    };
  }

  /**
   * Validate BKT parameters to ensure they're within acceptable ranges.
   *
   * @param params - BKT parameters to validate
   * @throws Error if parameters are invalid
   */
  validateParameters(params: BKTParameters): void {
    const { pGuess, pInit, pLearn, pSlip } = params;

    if (pInit < 0 || pInit > 1) {
      throw new Error(`Invalid pInit: ${pInit}. Must be between 0 and 1.`);
    }
    if (pLearn < 0 || pLearn > 1) {
      throw new Error(`Invalid pLearn: ${pLearn}. Must be between 0 and 1.`);
    }
    if (pSlip < 0 || pSlip > 1) {
      throw new Error(`Invalid pSlip: ${pSlip}. Must be between 0 and 1.`);
    }
    if (pGuess < 0 || pGuess > 1) {
      throw new Error(`Invalid pGuess: ${pGuess}. Must be between 0 and 1.`);
    }

    // Logical constraints
    if (pSlip + pGuess >= 1) {
      this.logger.warn(
        `pSlip (${pSlip}) + pGuess (${pGuess}) >= 1. This may cause issues.`,
      );
    }
  }

  /**
   * Compute posterior probability P(L_n | observation) using Bayes' theorem.
   *
   * For correct answer:
   *   P(L_n | correct) = P(L_n) * (1 - P(S)) /
   *                      [P(L_n) * (1 - P(S)) + (1 - P(L_n)) * P(G)]
   *
   * For incorrect answer:
   *   P(L_n | incorrect) = P(L_n) * P(S) /
   *                        [P(L_n) * P(S) + (1 - P(L_n)) * (1 - P(G))]
   *
   * @param priorL - Prior knowledge probability P(L_n)
   * @param correct - Whether the observation was correct
   * @param pSlip - Slip probability
   * @param pGuess - Guess probability
   * @returns Posterior probability P(L_n | observation)
   */
  private computePosterior(
    priorL: number,
    correct: boolean,
    pSlip: number,
    pGuess: number,
  ): number {
    let numerator: number;
    let denominator: number;

    if (correct) {
      // User answered correctly
      numerator = priorL * (1 - pSlip);
      denominator = priorL * (1 - pSlip) + (1 - priorL) * pGuess;
    } else {
      // User answered incorrectly
      numerator = priorL * pSlip;
      denominator = priorL * pSlip + (1 - priorL) * (1 - pGuess);
    }

    // Prevent division by zero (should never happen with valid params)
    if (denominator === 0) {
      this.logger.warn('Denominator is zero in BKT posterior calculation');
      return priorL; // Return prior unchanged
    }

    return numerator / denominator;
  }

  /**
   * Get learning recommendation based on current knowledge probability.
   *
   * @param probability - Current knowledge probability
   * @returns Recommendation for next learning action
   */
  private getRecommendation(
    probability: number,
  ): 'advance' | 'practice' | 'reassess' | 'review' {
    if (probability >= MASTERY_THRESHOLD) {
      return 'advance'; // User has mastered, move to next concept
    } else if (probability >= 0.7) {
      return 'practice'; // Close to mastery, keep practicing
    } else if (probability >= STRUGGLING_THRESHOLD) {
      return 'review'; // Moderate understanding, review material
    } else {
      return 'reassess'; // Low understanding, may need intervention
    }
  }
}
