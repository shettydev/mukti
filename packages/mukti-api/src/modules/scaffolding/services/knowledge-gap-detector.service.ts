import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Concept, ConceptDocument } from '../../../schemas/concept.schema';
import {
  KnowledgeState,
  KnowledgeStateDocument,
} from '../../../schemas/knowledge-state.schema';
import { BKTAlgorithmService } from '../../knowledge-tracing/services/bkt-algorithm.service';
import {
  BEHAVIORAL_THRESHOLDS,
  CONFUSION_MARKERS,
  FRUSTRATION_MARKERS,
  GAP_SCORE_THRESHOLDS,
  GAP_SCORE_WEIGHTS,
  GapDetectionInput,
  GapDetectionResult,
  KNOWLEDGE_GAP_MARKERS,
  ScaffoldLevel,
  TEMPORAL_THRESHOLDS,
} from '../interfaces/scaffolding.interface';
import { PrerequisiteCheckerService } from './prerequisite-checker.service';

/**
 * Knowledge Gap Detector Service - RFC-0001
 *
 * Implements multi-signal analysis to detect when users genuinely lack
 * foundational knowledge. Analyzes linguistic, behavioral, and temporal
 * signals along with BKT knowledge state to produce a gap score.
 *
 * @remarks
 * This service is called before AI prompt generation in DialogueQueueService.
 * When a gap is detected (score > threshold), it triggers appropriate
 * scaffolding interventions per RFC-0002.
 */
@Injectable()
export class KnowledgeGapDetectorService {
  private readonly logger = new Logger(KnowledgeGapDetectorService.name);

  constructor(
    @InjectModel(KnowledgeState.name)
    private readonly knowledgeStateModel: Model<KnowledgeStateDocument>,
    @InjectModel(Concept.name)
    private readonly conceptModel: Model<ConceptDocument>,
    private readonly bktService: BKTAlgorithmService,
    private readonly prerequisiteChecker: PrerequisiteCheckerService,
  ) {}

  /**
   * Analyze user message and context to detect knowledge gaps.
   *
   * @param input - Gap detection input containing message, history, and context
   * @returns GapDetectionResult with gap score, scaffold level, and signals
   */
  async analyze(input: GapDetectionInput): Promise<GapDetectionResult> {
    const {
      conceptContext,
      conversationHistory,
      previousResponseLengths,
      timeOnProblem,
      userId,
      userMessage,
    } = input;

    // Step 1: Extract linguistic signals from user message
    const linguisticScore = this.analyzeLinguisticSignals(userMessage);

    // Step 2: Analyze behavioral patterns from conversation history
    const behavioralScore = this.analyzeBehavioralSignals(
      conversationHistory,
      previousResponseLengths,
    );

    // Step 3: Check temporal signals
    const temporalScore = this.analyzeTemporalSignals(
      timeOnProblem,
      conversationHistory,
    );

    // Step 4: Detect concepts in the message
    const detectedConcepts = await this.detectConcepts(
      userMessage,
      conceptContext,
    );

    // Step 5: Get knowledge probability from BKT
    const knowledgeProbability = await this.getKnowledgeProbability(
      userId,
      detectedConcepts,
    );

    // Step 6: Calculate weighted gap score
    const gapScore = this.calculateGapScore(
      linguisticScore,
      behavioralScore,
      temporalScore,
      knowledgeProbability,
    );

    // Step 7: Determine scaffold level from gap score
    const scaffoldLevel = this.determineScaffoldLevel(gapScore);

    // Step 8: Find root gap if scaffolding is needed
    const { missingPrerequisites, rootGap } =
      scaffoldLevel > ScaffoldLevel.PURE_SOCRATIC
        ? await this.findRootGap(detectedConcepts, userId)
        : { missingPrerequisites: [], rootGap: null };

    // Step 9: Determine recommendation
    const recommendation = this.getRecommendation(gapScore);

    const result: GapDetectionResult = {
      detectedConcepts,
      gapScore,
      knowledgeProbability,
      missingPrerequisites,
      recommendation,
      rootGap,
      scaffoldLevel,
      signals: {
        behavioral: behavioralScore,
        linguistic: linguisticScore,
        temporal: temporalScore,
      },
    };

    this.logger.debug(
      `Gap Detection: score=${gapScore.toFixed(3)}, level=${scaffoldLevel}, ` +
        `P(L)=${knowledgeProbability.toFixed(3)}, rootGap=${rootGap || 'none'}`,
    );

    return result;
  }

  /**
   * Update knowledge state after a response is evaluated.
   *
   * @param userId - User ID
   * @param conceptId - Concept being assessed
   * @param isCorrect - Whether the response demonstrated understanding
   */
  async updateKnowledgeState(
    userId: string,
    conceptId: string,
    isCorrect: boolean,
  ): Promise<void> {
    const userObjectId = this.toObjectId(userId);

    let state = await this.knowledgeStateModel.findOne({
      conceptId,
      userId: userObjectId,
    });

    if (!state) {
      // Create new state with default parameters
      state = await this.knowledgeStateModel.create({
        attempts: 0,
        conceptId,
        correctAttempts: 0,
        currentProbability: 0.3,
        lastAssessed: new Date(),
        parameters: {
          pGuess: 0.25,
          pInit: 0.3,
          pLearn: 0.15,
          pSlip: 0.1,
        },
        userId: userObjectId,
      });
    }

    // Use BKT service to update
    const result = this.bktService.updateKnowledgeState(
      {
        attempts: state.attempts,
        conceptId,
        correctAttempts: state.correctAttempts,
        currentProbability: state.currentProbability,
        lastAssessed: state.lastAssessed,
        parameters: state.parameters,
        userId,
      },
      isCorrect,
    );

    // Persist updated state
    await this.knowledgeStateModel.updateOne(
      { _id: state._id },
      {
        $set: {
          attempts: result.state.attempts,
          correctAttempts: result.state.correctAttempts,
          currentProbability: result.state.currentProbability,
          lastAssessed: result.state.lastAssessed,
        },
      },
    );
  }

  /**
   * Analyze behavioral signals from conversation patterns.
   *
   * @returns Score 0-1 (higher = more problematic behavior)
   */
  private analyzeBehavioralSignals(
    history: GapDetectionInput['conversationHistory'],
    previousLengths?: number[],
  ): number {
    if (!history || history.length < 2) {
      return 0;
    }

    let score = 0;
    const userMessages = history.filter((m) => m.role === 'user');

    // Check for consecutive failures (same topic, wrong attempts)
    const recentUserMessages = userMessages.slice(-5);
    const similarMessages = this.countSimilarMessages(recentUserMessages);
    if (similarMessages >= BEHAVIORAL_THRESHOLDS.CONSECUTIVE_FAILURES) {
      score += 0.4;
    }

    // Check for help-seeking loops
    const helpSeekingCount = this.countHelpSeekingPatterns(userMessages);
    if (helpSeekingCount >= BEHAVIORAL_THRESHOLDS.HELP_SEEKING_LOOP) {
      score += 0.3;
    }

    // Check for response degradation (engagement drop)
    if (previousLengths && previousLengths.length >= 3) {
      const avgRecent =
        previousLengths.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const avgPrevious =
        previousLengths.slice(0, -2).reduce((a, b) => a + b, 0) /
        (previousLengths.length - 2);
      if (
        avgPrevious > 0 &&
        avgRecent / avgPrevious <
          BEHAVIORAL_THRESHOLDS.RESPONSE_DEGRADE_THRESHOLD
      ) {
        score += 0.3;
      }
    }

    return Math.min(score, 1);
  }

  /**
   * Analyze linguistic signals from user message.
   * Detects knowledge gap markers, confusion, and frustration.
   *
   * @returns Score 0-1 (higher = more gap indicators)
   */
  private analyzeLinguisticSignals(message: string): number {
    const lowerMessage = message.toLowerCase();
    let score = 0;

    // Check knowledge gap markers (highest weight)
    const gapMarkerCount = KNOWLEDGE_GAP_MARKERS.filter((marker) =>
      lowerMessage.includes(marker),
    ).length;
    score += Math.min(gapMarkerCount * 0.25, 0.5);

    // Check confusion markers
    const confusionCount = CONFUSION_MARKERS.filter((marker) =>
      lowerMessage.includes(marker),
    ).length;
    score += Math.min(confusionCount * 0.15, 0.3);

    // Check frustration markers (indicates gap becoming critical)
    const frustrationCount = FRUSTRATION_MARKERS.filter((marker) =>
      lowerMessage.includes(marker),
    ).length;
    score += Math.min(frustrationCount * 0.2, 0.4);

    // Check for question patterns indicating lack of knowledge
    const questionPatterns = [
      /what (?:is|are|does|do) /i,
      /how (?:does|do|can|should) /i,
      /why (?:is|does|do) /i,
      /can you explain/i,
      /i need help with/i,
    ];
    const questionCount = questionPatterns.filter((pattern) =>
      pattern.test(message),
    ).length;
    score += Math.min(questionCount * 0.1, 0.2);

    return Math.min(score, 1);
  }

  /**
   * Analyze temporal signals (time pressure, abandonment).
   *
   * @returns Score 0-1 (higher = more time-related issues)
   */
  private analyzeTemporalSignals(
    timeOnProblem?: number,
    history?: GapDetectionInput['conversationHistory'],
  ): number {
    let score = 0;

    // Check time spent on problem
    if (timeOnProblem) {
      const minutes = timeOnProblem / 60000;
      if (minutes > TEMPORAL_THRESHOLDS.TIME_ON_PROBLEM_MINUTES) {
        score += 0.5;
      } else if (minutes > TEMPORAL_THRESHOLDS.TIME_ON_PROBLEM_MINUTES / 2) {
        score += 0.25;
      }
    }

    // Check for long gaps in conversation (potential abandonment)
    if (history && history.length >= 2) {
      const recentWithTimestamps = history.slice(-3).filter((m) => m.timestamp);
      if (recentWithTimestamps.length >= 2) {
        for (let i = 1; i < recentWithTimestamps.length; i++) {
          const gap =
            new Date(recentWithTimestamps[i].timestamp!).getTime() -
            new Date(recentWithTimestamps[i - 1].timestamp!).getTime();
          if (gap > TEMPORAL_THRESHOLDS.ABANDONMENT_THRESHOLD_MS) {
            score += 0.3;
            break;
          }
        }
      }
    }

    return Math.min(score, 1);
  }

  /**
   * Calculate weighted gap score from all signals.
   */
  private calculateGapScore(
    linguisticScore: number,
    behavioralScore: number,
    temporalScore: number,
    knowledgeProbability: number,
  ): number {
    // Higher knowledge probability = lower gap, so invert it
    const knowledgeGapScore = 1 - knowledgeProbability;

    const gapScore =
      GAP_SCORE_WEIGHTS.linguistic * linguisticScore +
      GAP_SCORE_WEIGHTS.behavioral * behavioralScore +
      GAP_SCORE_WEIGHTS.temporal * temporalScore +
      GAP_SCORE_WEIGHTS.knowledge * knowledgeGapScore;

    return Math.min(Math.max(gapScore, 0), 1);
  }

  /**
   * Simple text similarity using Jaccard index on words.
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Count help-seeking patterns in messages.
   */
  private countHelpSeekingPatterns(
    messages: GapDetectionInput['conversationHistory'],
  ): number {
    const helpPatterns = [
      /help/i,
      /please/i,
      /can you/i,
      /i need/i,
      /tell me/i,
      /show me/i,
    ];

    return messages.filter((m) =>
      helpPatterns.some((pattern) => pattern.test(m.content)),
    ).length;
  }

  /**
   * Count similar messages (indicates repetitive struggle).
   */
  private countSimilarMessages(
    messages: GapDetectionInput['conversationHistory'],
  ): number {
    if (messages.length < 2) {
      return 0;
    }

    let similarCount = 0;
    for (let i = 1; i < messages.length; i++) {
      const similarity = this.calculateTextSimilarity(
        messages[i - 1].content,
        messages[i].content,
      );
      if (similarity > 0.6) {
        similarCount++;
      }
    }
    return similarCount;
  }

  /**
   * Detect concepts mentioned in the user message.
   */
  private async detectConcepts(
    message: string,
    contextConcepts?: string[],
  ): Promise<string[]> {
    const detectedConcepts: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Get active concepts from database
    const concepts = await this.conceptModel
      .find({ isActive: true })
      .select('conceptId keywords name')
      .lean();

    // Match keywords
    for (const concept of concepts) {
      const keywords = concept.keywords || [];
      const allKeywords = [
        ...keywords,
        concept.name.toLowerCase(),
        concept.conceptId.replace(/_/g, ' '),
      ];

      if (
        allKeywords.some((keyword) =>
          lowerMessage.includes(keyword.toLowerCase()),
        )
      ) {
        detectedConcepts.push(concept.conceptId);
      }
    }

    // Include context concepts if provided
    if (contextConcepts) {
      for (const conceptId of contextConcepts) {
        if (!detectedConcepts.includes(conceptId)) {
          detectedConcepts.push(conceptId);
        }
      }
    }

    return detectedConcepts;
  }

  /**
   * Determine scaffold level from gap score.
   */
  private determineScaffoldLevel(gapScore: number): ScaffoldLevel {
    if (gapScore < GAP_SCORE_THRESHOLDS.PURE_SOCRATIC_MAX) {
      return ScaffoldLevel.PURE_SOCRATIC;
    } else if (gapScore < GAP_SCORE_THRESHOLDS.META_COGNITIVE_MAX) {
      return ScaffoldLevel.META_COGNITIVE;
    } else if (gapScore < GAP_SCORE_THRESHOLDS.STRATEGIC_HINTS_MAX) {
      return ScaffoldLevel.STRATEGIC_HINTS;
    } else if (gapScore < GAP_SCORE_THRESHOLDS.WORKED_EXAMPLES_MAX) {
      return ScaffoldLevel.WORKED_EXAMPLES;
    } else {
      return ScaffoldLevel.DIRECT_INSTRUCTION;
    }
  }

  /**
   * Find root knowledge gap through recursive prerequisite checking.
   * Delegates to PrerequisiteCheckerService (depth=3 max).
   */
  private async findRootGap(
    conceptIds: string[],
    userId: string,
  ): Promise<{ missingPrerequisites: string[]; rootGap: null | string }> {
    if (!conceptIds.length) {
      return { missingPrerequisites: [], rootGap: null };
    }

    const result = await this.prerequisiteChecker.checkMultiple(
      conceptIds,
      userId,
    );

    return {
      missingPrerequisites: result.missingPrerequisites,
      rootGap: result.rootGap,
    };
  }

  /**
   * Get average knowledge probability for detected concepts.
   */
  private async getKnowledgeProbability(
    userId: string,
    conceptIds: string[],
  ): Promise<number> {
    if (!conceptIds.length) {
      return 0.5; // Default neutral probability
    }

    const userObjectId = this.toObjectId(userId);

    const states = await this.knowledgeStateModel
      .find({
        conceptId: { $in: conceptIds },
        userId: userObjectId,
      })
      .select('currentProbability')
      .lean();

    if (states.length === 0) {
      return 0.3; // Default initial probability if no states exist
    }

    const avgProbability =
      states.reduce((sum, s) => sum + s.currentProbability, 0) / states.length;

    return avgProbability;
  }

  /**
   * Get recommendation based on gap score.
   */
  private getRecommendation(
    gapScore: number,
  ): 'scaffold' | 'socratic' | 'teach' {
    if (gapScore < GAP_SCORE_THRESHOLDS.PURE_SOCRATIC_MAX) {
      return 'socratic';
    } else if (gapScore < GAP_SCORE_THRESHOLDS.WORKED_EXAMPLES_MAX) {
      return 'scaffold';
    } else {
      return 'teach';
    }
  }

  private toObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid userId format: ${userId}`);
    }
    return new Types.ObjectId(userId);
  }
}
