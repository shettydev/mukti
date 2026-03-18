import { Injectable, Logger } from '@nestjs/common';

import type { PostResponseMetrics } from '../interfaces/quality.interface';

@Injectable()
export class PostResponseMonitorService {
  private readonly logger = new Logger(PostResponseMonitorService.name);

  monitor(responseText: string): PostResponseMetrics {
    const questionCount = (responseText.match(/\?/g) || []).length;
    const violations: string[] = [];

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
}
