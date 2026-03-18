import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { QualityDirective } from '../interfaces/quality.interface';

/**
 * RFC-0004: 5.1 — Socratic Acknowledgment Protocol.
 *
 * Injects epistemic validation instructions whenever the learner demonstrates
 * correct understanding. Validation style varies by scaffold level:
 *
 * | Level | Style                                                     |
 * |-------|-----------------------------------------------------------|
 * | 0     | Minimal: "Yes, that's right." + deeper question           |
 * | 1     | Reflective: confirm + ask what led them there             |
 * | 2     | Connective: confirm + ask how it fits with prior topic    |
 * | 3     | Pattern-confirming: confirm correct pattern application   |
 * | 4     | Explicit: confirm + brief reason why                      |
 *
 * This is distinct from BreakthroughDetectorService, which handles the
 * special case of understanding demonstrated *after* consecutive failures.
 * The acknowledgment protocol fires on ANY demonstrated understanding.
 */
@Injectable()
export class AcknowledgmentProtocolService {
  private readonly logger = new Logger(AcknowledgmentProtocolService.name);

  constructor(private readonly configService: ConfigService) {}

  getDirective(input: {
    demonstratesUnderstanding?: boolean;
    scaffoldLevel: number;
  }): null | QualityDirective {
    const enabled = this.configService.get<string>(
      'DIALOGUE_QUALITY_ACKNOWLEDGMENT_ENABLED',
      'true',
    );
    if (enabled !== 'true') {
      return null;
    }

    if (!input.demonstratesUnderstanding) {
      return null;
    }

    const levelInstruction = this.getLevelInstruction(input.scaffoldLevel);

    this.logger.debug(
      `Acknowledgment protocol triggered at scaffold level ${input.scaffoldLevel}`,
    );

    return {
      instruction:
        'ACKNOWLEDGMENT PROTOCOL: The learner has demonstrated correct understanding. ' +
        levelInstruction +
        ' NEVER use emotional praise ("good job", "well done", "great work"). ' +
        'Validation is epistemic (confirming correctness), not affective (rewarding behavior).',
      priority: 2,
      source: 'acknowledgment',
    };
  }

  private getLevelInstruction(scaffoldLevel: number): string {
    switch (scaffoldLevel) {
      case 0:
        return (
          'Validate briefly: "Yes, that\'s right." or "That\'s the key insight." ' +
          'Then DEEPEN immediately with a question that builds on their correct understanding.'
        );
      case 1:
        return (
          'Validate reflectively: "You\'ve identified [concept]. What made you arrive at that?" ' +
          'Help them become aware of the reasoning process that led to the correct answer.'
        );
      case 2:
        return (
          'Validate connectively: "Exactly — [concept]. How does this piece fit with [prior topic]?" ' +
          'Bridge their correct understanding to related concepts.'
        );
      case 3:
        return (
          'Validate the pattern: "You\'ve correctly applied the pattern from [example]." ' +
          'Then ask them to extend the pattern to a new situation.'
        );
      case 4:
        return (
          'Validate explicitly: "That\'s correct. [concept] works because [brief reason]." ' +
          'Provide the minimal explanation that reinforces why they are right, then return to questioning.'
        );
      default:
        return (
          'Validate briefly: "Yes, that\'s right." ' +
          'Then follow with a question that builds on their correct understanding.'
        );
    }
  }
}
