import { Injectable, Logger } from '@nestjs/common';

import type {
  MisconceptionResult,
  PostResponseMetrics,
  QualityDirectives,
} from '../dialogue-quality/interfaces/quality.interface';

import { AiKeyResolver } from '../ai/services/ai-key-resolver.service';
import { AiPolicyService } from '../ai/services/ai-policy.service';
import { DialogueQualityService } from '../dialogue-quality/services/dialogue-quality.service';
import { PostResponseMonitorService } from '../dialogue-quality/services/post-response-monitor.service';
import {
  type GapDetectionResult,
  type ScaffoldContext,
  ScaffoldLevel,
  type TransitionResult,
} from '../scaffolding/interfaces/scaffolding.interface';
import { KnowledgeGapDetectorService } from '../scaffolding/services/knowledge-gap-detector.service';
import { ResponseEvaluatorService } from '../scaffolding/services/response-evaluator.service';
import { ScaffoldFadeService } from '../scaffolding/services/scaffold-fade.service';

/**
 * The learner state a surface has stored for one dialogue (a chat
 * conversation, a canvas node, or a thought-map node).
 */
export interface LearnerTurnState {
  conclusionOffered?: boolean;
  consecutiveFailures?: number;
  consecutiveSuccesses?: number;
  currentScaffoldLevel?: number;
  detectedConcepts?: string[];
  totalMessageCount?: number;
}

/** Everything a surface needs to build its prompt and call the model. */
export interface PreparedTurn {
  apiKey: string;
  gapResult: GapDetectionResult;
  /** Internal: carried from prepare to settle. */
  readonly input: PrepareTurnInput;
  model: string;
  readonly preDemonstratesUnderstanding: boolean;
  qualityDirectives: QualityDirectives;
  scaffoldContext: ScaffoldContext;
  /** The level stored before this turn (what the user was answering at). */
  readonly storedLevel: ScaffoldLevel;
}

export interface PrepareTurnInput {
  /** Prior turns, oldest first, with real timestamps where known. */
  conversationHistory: {
    content: string;
    role: 'assistant' | 'user';
    timestamp?: Date;
  }[];
  /** The model requested for this job (validated here). */
  model: string;
  /** Lengths of the user's earlier replies, for disengagement signals. */
  previousResponseLengths: number[];
  state: LearnerTurnState;
  timeOnProblem?: number;
  usedByok: boolean;
  userId: string;
  userMessage: string;
  wrapUpRequested?: boolean;
}

/** What changed for the learner this turn. The surface persists it. */
export interface TurnOutcome {
  isBreakthrough: boolean;
  misconception?: MisconceptionResult;
  /**
   * Present only when the user was answering an earlier assistant turn, so
   * their reply could be judged. Absent on a dialogue's first exchange.
   */
  scaffoldUpdate?: {
    demonstratedUnderstanding: boolean;
    /**
     * Mongo filter fragment matching the scaffold state this turn read.
     * Surfaces add it to their update filter so a concurrent turn on the
     * same dialogue cannot be silently overwritten (see
     * {@link scaffoldStateGuard}).
     */
    guard: Record<string, unknown>;
    transition: TransitionResult;
  };
}

/**
 * Builds a filter that matches a dialogue only if its scaffold level and
 * counters are still what a turn read. Zero also matches a missing field,
 * because older documents predate the schema defaults.
 */
export function scaffoldStateGuard(
  state: LearnerTurnState,
): Record<string, unknown> {
  const stored = (value: number | undefined) =>
    (value ?? 0) === 0 ? { $in: [0, null] } : value;

  return {
    consecutiveFailures: stored(state.consecutiveFailures),
    consecutiveSuccesses: stored(state.consecutiveSuccesses),
    currentScaffoldLevel: stored(state.currentScaffoldLevel),
  };
}

/**
 * One Socratic turn, the same for chat, canvas node chat and thought-map node
 * chat (RFC-0001 gap detection, RFC-0002 scaffolding, RFC-0004 quality).
 *
 * @remarks
 * This logic used to be copied into three queue processors and had drifted:
 * thought-map node chat skipped the quality guardrails and the reply monitor.
 * Surfaces now own only what is genuinely theirs (loading and saving their
 * dialogue, building their system prompt, streaming events); the learner
 * model runs here, once.
 *
 * Usage per job:
 * 1. `prepare` before calling the model, then pass `scaffoldContext` and
 *    `qualityDirectives` into the surface's prompt builder.
 * 2. `inspectReply` on the model's reply.
 * 3. `settle` after the reply is stored. It updates per-user knowledge and
 *    returns the dialogue-level changes for the surface to persist.
 */
@Injectable()
export class SocraticTurnEngine {
  private readonly logger = new Logger(SocraticTurnEngine.name);

  constructor(
    private readonly aiKeyResolver: AiKeyResolver,
    private readonly aiPolicyService: AiPolicyService,
    private readonly dialogueQualityService: DialogueQualityService,
    private readonly knowledgeGapDetector: KnowledgeGapDetectorService,
    private readonly postResponseMonitor: PostResponseMonitorService,
    private readonly responseEvaluator: ResponseEvaluatorService,
    private readonly scaffoldFadeService: ScaffoldFadeService,
  ) {}

  inspectReply(replyText: string): PostResponseMetrics {
    return this.postResponseMonitor.monitor(replyText);
  }

  async prepare(input: PrepareTurnInput): Promise<PreparedTurn> {
    const { apiKey, model } = await this.resolveAi(
      input.model,
      input.usedByok,
      input.userId,
    );
    const { state, userMessage } = input;
    const storedLevel = (state.currentScaffoldLevel ??
      ScaffoldLevel.PURE_SOCRATIC) as ScaffoldLevel;

    // Judge the new message against stored concepts first, so the quality
    // assessment can use it without waiting for gap detection.
    const preEvaluation = this.responseEvaluator.evaluate({
      conceptKeywords: state.detectedConcepts ?? [],
      scaffoldLevel: storedLevel,
      userResponse: userMessage,
    });

    const [gapResult, qualityDirectives] = await Promise.all([
      this.knowledgeGapDetector.analyze({
        aiApiKey: apiKey,
        aiModel: model,
        conceptContext: state.detectedConcepts,
        conversationHistory: input.conversationHistory,
        previousResponseLengths: input.previousResponseLengths,
        timeOnProblem: input.timeOnProblem,
        userId: input.userId,
        userMessage,
      }),
      this.dialogueQualityService.assess({
        conceptContext: state.detectedConcepts ?? [],
        conclusionOffered: state.conclusionOffered ?? false,
        consecutiveFailures: state.consecutiveFailures ?? 0,
        conversationHistory: input.conversationHistory.map((m) => ({
          content: m.content,
          role: m.role,
        })),
        demonstratesUnderstanding:
          preEvaluation.quality.demonstratesUnderstanding,
        scaffoldLevel: storedLevel,
        totalMessageCount: state.totalMessageCount ?? 0,
        userId: input.userId,
        userMessage,
        wrapUpRequested: input.wrapUpRequested,
      }),
    ]);

    // Gap detection may only raise the level. Only the fade controller (the
    // two-success rule) lowers it, so help never drops abruptly mid-dialogue.
    const level = Math.max(
      gapResult.scaffoldLevel,
      storedLevel,
    ) as ScaffoldLevel;

    return {
      apiKey,
      gapResult,
      input,
      model,
      preDemonstratesUnderstanding:
        preEvaluation.quality.demonstratesUnderstanding,
      qualityDirectives,
      scaffoldContext: {
        conceptContext: gapResult.detectedConcepts,
        consecutiveFailures: state.consecutiveFailures ?? 0,
        consecutiveSuccesses: state.consecutiveSuccesses ?? 0,
        level,
        rootGap: gapResult.rootGap ?? undefined,
      },
      storedLevel,
    };
  }

  /**
   * Validates the job's model against policy and resolves the API key.
   * Exposed for surface jobs that call the model outside a full turn (for
   * example a thought-map node's opening question).
   */
  async resolveAi(
    requestedModel: string,
    usedByok: boolean,
    userId: string,
  ): Promise<{ apiKey: string; model: string }> {
    const model = requestedModel.trim();

    if (!model) {
      throw new Error('Model is required');
    }

    if (!usedByok) {
      const isCurated = this.aiPolicyService
        .getCuratedModels()
        .some((allowed) => allowed.id === model);

      if (!isCurated) {
        throw new Error('MODEL_NOT_ALLOWED');
      }
    }

    const apiKey = await this.aiKeyResolver.resolve({ usedByok, userId });
    return { apiKey, model };
  }

  async settle(
    turn: PreparedTurn,
    options: { hasPriorAssistantMessage: boolean },
  ): Promise<TurnOutcome> {
    const { gapResult, input, storedLevel } = turn;
    const { state } = input;
    const failuresBefore = state.consecutiveFailures ?? 0;

    const outcome: TurnOutcome = {
      isBreakthrough:
        options.hasPriorAssistantMessage &&
        turn.preDemonstratesUnderstanding &&
        failuresBefore >= 2,
      misconception: turn.qualityDirectives.misconception,
    };

    if (!options.hasPriorAssistantMessage) {
      return outcome;
    }

    // The user was answering the previous assistant turn, so judge them
    // against the level that turn was written at, not the newly raised one.
    const responseQuality = this.responseEvaluator.evaluate({
      conceptKeywords: state.detectedConcepts ?? gapResult.detectedConcepts,
      scaffoldLevel: storedLevel,
      userResponse: input.userMessage,
    });

    const transition = this.scaffoldFadeService.evaluateAndTransition(
      {
        consecutiveFailures: failuresBefore,
        consecutiveSuccesses: state.consecutiveSuccesses ?? 0,
        currentLevel: storedLevel,
        transitionHistory: [],
      },
      responseQuality.quality,
    );
    const demonstratedUnderstanding =
      responseQuality.quality.demonstratesUnderstanding;

    const conceptsToUpdate = new Set(gapResult.detectedConcepts);
    if (gapResult.rootGap) {
      conceptsToUpdate.add(gapResult.rootGap);
    }
    // Knowledge writes run after the reply is already saved. A failure here
    // must not fail the job: a BullMQ retry would store and bill the reply
    // twice. Log it and keep the turn.
    const writes = await Promise.allSettled(
      Array.from(conceptsToUpdate).map((conceptId) =>
        this.knowledgeGapDetector.updateKnowledgeState(
          input.userId,
          conceptId,
          demonstratedUnderstanding,
        ),
      ),
    );
    for (const write of writes) {
      if (write.status === 'rejected') {
        this.logger.error(
          `Knowledge update failed for user ${input.userId}: ${String(write.reason)}`,
        );
      }
    }

    outcome.scaffoldUpdate = {
      demonstratedUnderstanding,
      guard: scaffoldStateGuard(state),
      transition,
    };
    return outcome;
  }
}
