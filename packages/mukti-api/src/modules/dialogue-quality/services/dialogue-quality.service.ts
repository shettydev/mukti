import { Injectable, Logger } from '@nestjs/common';

import type {
  QualityAssessmentInput,
  QualityDirective,
  QualityDirectives,
} from '../interfaces/quality.interface';

import { AcknowledgmentProtocolService } from './acknowledgment-protocol.service';
import { BreakthroughDetectorService } from './breakthrough-detector.service';
import { MisconceptionDetectorService } from './misconception-detector.service';
import { SingleQuestionEnforcerService } from './single-question-enforcer.service';

@Injectable()
export class DialogueQualityService {
  private readonly logger = new Logger(DialogueQualityService.name);

  constructor(
    private readonly misconceptionDetector: MisconceptionDetectorService,
    private readonly acknowledgmentProtocol: AcknowledgmentProtocolService,
    private readonly breakthroughDetector: BreakthroughDetectorService,
    private readonly singleQuestionEnforcer: SingleQuestionEnforcerService,
  ) {}

  async assess(input: QualityAssessmentInput): Promise<QualityDirectives> {
    const directives: QualityDirective[] = [];

    // 1. Misconception detection (async, fail-open)
    const misconception = await this.misconceptionDetector.detect({
      conceptContext: input.conceptContext,
      conversationHistory: input.conversationHistory,
      userId: input.userId,
      userMessage: input.userMessage,
    });

    if (misconception.hasMisconception) {
      this.logger.log(
        `Misconception detected for user ${input.userId}: ${misconception.conceptName}`,
      );
      directives.push({
        instruction:
          `MISCONCEPTION DETECTED: The user appears to believe "${misconception.detectedBelief ?? 'unknown'}". ` +
          `This relates to "${misconception.conceptName ?? 'the topic'}". ` +
          `Guide them toward reconsidering this belief through questioning. ` +
          (misconception.correctDirection
            ? `Hint direction: ${misconception.correctDirection}. `
            : '') +
          'Do NOT directly correct them — use Socratic questioning to help them discover the error.',
        priority: 0,
        source: 'misconception',
      });
    }

    // 2. Breakthrough detection (sync) — special case: understanding after struggle
    const breakthroughDirective = this.breakthroughDetector.detect({
      consecutiveFailures: input.consecutiveFailures,
      demonstratesUnderstanding: input.demonstratesUnderstanding,
    });
    if (breakthroughDirective) {
      directives.push(breakthroughDirective);
    }

    // 3. RFC-0004 §5.1: Acknowledgment protocol (sync) — fires on ANY demonstrated understanding
    // Skipped when breakthrough already fires (breakthrough subsumes acknowledgment with
    // a stronger "after struggle" message)
    if (!breakthroughDirective) {
      const acknowledgmentDirective = this.acknowledgmentProtocol.getDirective({
        demonstratesUnderstanding: input.demonstratesUnderstanding,
        scaffoldLevel: input.scaffoldLevel,
      });
      if (acknowledgmentDirective) {
        directives.push(acknowledgmentDirective);
      }
    }

    // 4. Single question enforcer (sync)
    const singleQuestionDirective = this.singleQuestionEnforcer.getDirective();
    if (singleQuestionDirective) {
      directives.push(singleQuestionDirective);
    }

    // Sort by priority (lower = higher priority)
    directives.sort((a, b) => a.priority - b.priority);

    return { directives, misconception };
  }
}
