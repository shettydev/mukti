import { Injectable, Logger } from '@nestjs/common';

import type { TurnKind } from '../../socratic-turn/help-controls';
import type { PostResponseMetrics } from '../interfaces/quality.interface';

/** Explain replies longer than this are logged as a possible solution leak. */
export const EXPLAIN_MAX_WORDS = 180;
/** A fenced code block longer than this in an Explain reply is logged. */
export const EXPLAIN_MAX_CODE_LINES = 8;

@Injectable()
export class PostResponseMonitorService {
  private readonly logger = new Logger(PostResponseMonitorService.name);

  monitor(
    responseText: string,
    turnKind: TurnKind = 'ordinary',
  ): PostResponseMetrics {
    // Count question marks that are NOT inside quoted strings
    const withoutQuotes = responseText
      .replace(/"[^"]*"/g, '')
      .replace(/'[^']*'/g, '');
    const questionCount = (withoutQuotes.match(/\?/g) ?? []).length;
    const violations: string[] = [];

    // Explain and wrap-up replies are prose by design: no question is
    // expected, and a trailing one means the model ignored the protocol.
    if (turnKind === 'explain' || turnKind === 'wrap_up') {
      if (/\?\s*$/.test(withoutQuotes.trim())) {
        violations.push(`${turnKind}-ends-with-question`);
      }
      if (turnKind === 'explain') {
        violations.push(...this.explainLeakSignals(responseText));
      }
      for (const violation of violations) {
        this.logger.warn(`Post-response violation (${turnKind}): ${violation}`);
      }
      return { questionCount, violations };
    }

    if (questionCount > 1) {
      violations.push(`multiple-questions:${questionCount}`);
      this.logger.warn(
        `Post-response violation: ${questionCount} questions detected in AI response`,
      );
    }

    if (questionCount === 0) {
      this.logger.debug('Post-response note: no questions in AI response');
    }

    return { questionCount, violations };
  }

  /**
   * Heuristics for an Explain reply that handed over more than one missing
   * piece (design Risks: "Explain leaks a full solution"). Logged only; the
   * reply is still delivered.
   */
  private explainLeakSignals(text: string): string[] {
    const signals: string[] = [];
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words > EXPLAIN_MAX_WORDS) {
      signals.push(`explain-too-long:${words}`);
    }
    const blocks = text.match(/```[\s\S]*?```/g) ?? [];
    for (const block of blocks) {
      const lines = block.split('\n').length - 2;
      if (lines > EXPLAIN_MAX_CODE_LINES) {
        signals.push(`explain-code-block:${lines}`);
      }
    }
    return signals;
  }
}
