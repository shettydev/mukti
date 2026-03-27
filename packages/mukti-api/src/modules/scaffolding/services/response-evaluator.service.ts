import { Injectable, Logger } from '@nestjs/common';

import {
  ResponseQuality,
  ScaffoldLevel,
} from '../interfaces/scaffolding.interface';

/**
 * Evaluation input for response analysis.
 */
export interface EvaluationInput {
  /** Keywords to look for (optional) */
  conceptKeywords?: string[];
  /** Expected concept being assessed (optional) */
  expectedConcept?: string;
  /** Previous user responses for comparison (optional) */
  previousResponses?: string[];
  /** Current scaffold level for context */
  scaffoldLevel: ScaffoldLevel;
  /** The user's response text */
  userResponse: string;
}

/**
 * Detailed evaluation result.
 */
export interface EvaluationResult {
  /** Breakdown of analysis */
  analysis: {
    averageWordLength: number;
    conceptMentions: number;
    explanationIndicators: number;
    patternApplications: number;
    questionCount: number;
    responseLength: number;
  };
  /** Suggestions for improvement (for internal use) */
  feedback?: string[];
  /** Overall quality assessment */
  quality: ResponseQuality;
  /** Raw scores before normalization */
  rawScores: {
    application: number;
    depth: number;
    engagement: number;
    relevance: number;
  };
}

/**
 * Patterns that indicate explanation/understanding.
 */
const EXPLANATION_PATTERNS = [
  /because/i,
  /since/i,
  /therefore/i,
  /so that/i,
  /this means/i,
  /in other words/i,
  /the reason is/i,
  /due to/i,
  /as a result/i,
  /consequently/i,
  /which leads to/i,
  /this implies/i,
];

/**
 * Patterns that indicate pattern application/transfer.
 */
const APPLICATION_PATTERNS = [
  /similar to/i,
  /like when/i,
  /same as/i,
  /applies to/i,
  /would work for/i,
  /could use this/i,
  /in this case/i,
  /for example/i,
  /if I/i,
  /I would/i,
  /I could/i,
  /I can/i,
];

/**
 * Patterns that indicate relevant questioning (good sign at high scaffold levels).
 */
const QUESTION_PATTERNS = [
  /what if/i,
  /how would/i,
  /why does/i,
  /could this/i,
  /would it be/i,
  /is it because/i,
  /does this mean/i,
  /so if I/i,
];

/**
 * Negative patterns that indicate struggle/confusion.
 */
const STRUGGLE_PATTERNS = [
  /i don't know/i,
  /i'm not sure/i,
  /i don't understand/i,
  /confused/i,
  /lost/i,
  /no idea/i,
  /help/i,
  /what is/i,
  /\?{2,}/, // Multiple question marks
];

/**
 * Response Evaluator Service - RFC-0002
 *
 * Evaluates user responses to determine if they demonstrate understanding.
 * This drives the scaffold fading logic - successful responses lead to
 * reduced support, while struggling responses maintain or increase support.
 *
 * @remarks
 * The evaluation is multi-dimensional:
 * - Depth: Does the response show deep vs. surface understanding?
 * - Relevance: Does it address the concept being discussed?
 * - Engagement: Is the user actively thinking (questions, applications)?
 * - Application: Can they transfer knowledge to new contexts?
 *
 * Lower scaffold levels require higher quality for "success" because
 * we expect more independence at those levels.
 */
@Injectable()
export class ResponseEvaluatorService {
  private readonly logger = new Logger(ResponseEvaluatorService.name);

  /**
   * Evaluate a user response and determine its quality.
   *
   * @param input - Evaluation input with response and context
   * @returns Evaluation result with quality assessment
   */
  evaluate(input: EvaluationInput): EvaluationResult {
    const { conceptKeywords, scaffoldLevel, userResponse } = input;

    // Analyze response characteristics
    const analysis = this.analyzeResponse(userResponse, conceptKeywords);

    // Calculate raw scores
    const rawScores = this.calculateRawScores(analysis, userResponse);

    // Determine quality based on scaffold level expectations
    const quality = this.determineQuality(rawScores, scaffoldLevel, analysis);

    // Generate feedback (internal use)
    const feedback = this.generateFeedback(quality, analysis);

    const result: EvaluationResult = {
      analysis,
      feedback,
      quality,
      rawScores,
    };

    this.logger.debug(
      `Response evaluation: confidence=${quality.confidence.toFixed(2)}, ` +
        `understands=${quality.demonstratesUnderstanding}, ` +
        `level=${ScaffoldLevel[scaffoldLevel]}`,
    );

    return result;
  }

  /**
   * Quick check if a response is obviously insufficient.
   * Used for early rejection before full analysis.
   *
   * @param response - User response text
   * @returns True if response is clearly insufficient
   */
  isInsufficientResponse(response: string): boolean {
    const trimmed = response.trim();

    // Too short
    if (trimmed.length < 5) {
      return true;
    }

    // Only punctuation or special characters
    if (/^[^\w\s]+$/.test(trimmed)) {
      return true;
    }

    // Single word non-answers
    const singleWordNonAnswers = [
      'idk',
      'ok',
      'okay',
      'sure',
      'yes',
      'no',
      'maybe',
      'dunno',
      'what',
      'huh',
      '?',
      'help',
    ];
    if (singleWordNonAnswers.includes(trimmed.toLowerCase())) {
      return true;
    }

    return false;
  }

  /**
   * Evaluate if response shows improvement over previous responses.
   * Useful for tracking progress within a session.
   *
   * @param current - Current response
   * @param previous - Previous responses
   * @returns True if current response is better
   */
  showsImprovement(current: string, previous: string[]): boolean {
    if (previous.length === 0) {
      return false;
    }

    const currentResult = this.evaluate({
      scaffoldLevel: ScaffoldLevel.PURE_SOCRATIC, // Use baseline level
      userResponse: current,
    });

    const prevConfidences = previous.map(
      (p) =>
        this.evaluate({
          scaffoldLevel: ScaffoldLevel.PURE_SOCRATIC,
          userResponse: p,
        }).quality.confidence,
    );

    const avgPrevConfidence =
      prevConfidences.reduce((a, b) => a + b, 0) / prevConfidences.length;

    return currentResult.quality.confidence > avgPrevConfidence;
  }

  /**
   * Analyze response characteristics.
   */
  private analyzeResponse(
    response: string,
    conceptKeywords?: string[],
  ): EvaluationResult['analysis'] {
    const words = response.split(/\s+/).filter(Boolean);

    return {
      averageWordLength:
        words.length > 0
          ? words.reduce((sum, w) => sum + w.length, 0) / words.length
          : 0,
      conceptMentions: conceptKeywords
        ? this.countConceptMentions(response, conceptKeywords)
        : 0,
      explanationIndicators: this.countPatternMatches(
        response,
        EXPLANATION_PATTERNS,
      ),
      patternApplications: this.countPatternMatches(
        response,
        APPLICATION_PATTERNS,
      ),
      questionCount: (response.match(/\?/g) ?? []).length,
      responseLength: words.length,
    };
  }

  /**
   * Calculate raw scores from analysis.
   */
  private calculateRawScores(
    analysis: EvaluationResult['analysis'],
    response: string,
  ): EvaluationResult['rawScores'] {
    // Depth: longer, more complex responses suggest deeper thought
    const depthScore = Math.min(
      (analysis.responseLength / 50) * 0.5 + // Length factor
        (analysis.explanationIndicators / 3) * 0.5, // Explanation factor
      1,
    );

    // Relevance: mentions concepts, stays on topic
    const relevanceScore = Math.min(
      (analysis.conceptMentions / 2) * 0.6 +
        (analysis.patternApplications > 0 ? 0.4 : 0),
      1,
    );

    // Engagement: asks questions, applies patterns
    const questionScore = this.countPatternMatches(response, QUESTION_PATTERNS);
    const engagementScore = Math.min(
      (questionScore / 2) * 0.5 + (analysis.patternApplications / 2) * 0.5,
      1,
    );

    // Application: shows transfer of knowledge
    const applicationScore = Math.min(
      this.countPatternMatches(response, APPLICATION_PATTERNS) / 3,
      1,
    );

    // Penalty for struggle indicators
    const struggleCount = this.countPatternMatches(response, STRUGGLE_PATTERNS);
    const strugglePenalty = Math.min(struggleCount * 0.2, 0.5);

    return {
      application: Math.max(applicationScore - strugglePenalty * 0.3, 0),
      depth: Math.max(depthScore - strugglePenalty, 0),
      engagement: Math.max(engagementScore - strugglePenalty * 0.3, 0),
      relevance: Math.max(relevanceScore - strugglePenalty * 0.5, 0),
    };
  }

  /**
   * Count mentions of concept keywords.
   */
  private countConceptMentions(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    return keywords.filter((kw) => lowerText.includes(kw.toLowerCase())).length;
  }

  /**
   * Count matches for a set of patterns.
   */
  private countPatternMatches(text: string, patterns: RegExp[]): number {
    return patterns.filter((pattern) => pattern.test(text)).length;
  }

  /**
   * Determine quality based on scores and scaffold level.
   * Lower scaffold levels require higher scores for "success".
   */
  private determineQuality(
    scores: EvaluationResult['rawScores'],
    level: ScaffoldLevel,
    analysis: EvaluationResult['analysis'],
  ): ResponseQuality {
    // Calculate overall confidence
    const weights = {
      application: 0.2,
      depth: 0.3,
      engagement: 0.2,
      relevance: 0.3,
    };
    const confidence =
      scores.depth * weights.depth +
      scores.relevance * weights.relevance +
      scores.engagement * weights.engagement +
      scores.application * weights.application;

    // Threshold varies by scaffold level
    // At PURE_SOCRATIC, we need higher quality to confirm understanding
    // At DIRECT_INSTRUCTION, we're more lenient since we just taught something
    const thresholds: Record<ScaffoldLevel, number> = {
      [ScaffoldLevel.DIRECT_INSTRUCTION]: 0.35,
      [ScaffoldLevel.META_COGNITIVE]: 0.55,
      [ScaffoldLevel.PURE_SOCRATIC]: 0.65,
      [ScaffoldLevel.STRATEGIC_HINTS]: 0.45,
      [ScaffoldLevel.WORKED_EXAMPLES]: 0.4,
    };

    const threshold = thresholds[level];
    const demonstratesUnderstanding = confidence >= threshold;

    return {
      confidence,
      demonstratesUnderstanding,
      signals: {
        appliesPattern: analysis.patternApplications >= 1,
        asksRelevantQuestion: analysis.questionCount >= 1,
        hasExplanation: analysis.explanationIndicators >= 1,
        mentionsConcept: analysis.conceptMentions >= 1,
      },
    };
  }

  /**
   * Generate internal feedback for debugging/improvement.
   */
  private generateFeedback(
    quality: ResponseQuality,
    analysis: EvaluationResult['analysis'],
  ): string[] {
    const feedback: string[] = [];

    if (!quality.demonstratesUnderstanding) {
      if (analysis.responseLength < 10) {
        feedback.push('Response too brief - encourage elaboration');
      }
      if (analysis.explanationIndicators === 0) {
        feedback.push('No explanatory language - prompt for reasoning');
      }
      if (analysis.conceptMentions === 0) {
        feedback.push('Concept not mentioned - may need refocusing');
      }
    } else {
      if (quality.confidence > 0.8) {
        feedback.push('Strong understanding - consider fading support');
      }
    }

    return feedback;
  }
}
