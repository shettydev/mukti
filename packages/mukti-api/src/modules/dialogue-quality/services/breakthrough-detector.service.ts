import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { QualityDirective } from '../interfaces/quality.interface';

@Injectable()
export class BreakthroughDetectorService {
  private readonly logger = new Logger(BreakthroughDetectorService.name);

  constructor(private readonly configService: ConfigService) {}

  detect(input: {
    consecutiveFailures: number;
    demonstratesUnderstanding?: boolean;
  }): null | QualityDirective {
    const enabled = this.configService.get<string>(
      'DIALOGUE_QUALITY_BREAKTHROUGH_ENABLED',
      'true',
    );
    if (enabled !== 'true') {
      return null;
    }

    if (input.demonstratesUnderstanding && input.consecutiveFailures >= 2) {
      this.logger.debug(
        `Breakthrough detected after ${input.consecutiveFailures} consecutive failures`,
      );
      return {
        instruction:
          'BREAKTHROUGH CONFIRMATION: The learner has just demonstrated understanding after struggling. ' +
          'Acknowledge their progress briefly (one sentence), then verify their understanding ' +
          'by asking them to apply or extend what they just grasped.',
        priority: 1,
        source: 'breakthrough',
      };
    }

    return null;
  }
}
