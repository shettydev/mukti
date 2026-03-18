import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { QualityDirective } from '../interfaces/quality.interface';

@Injectable()
export class SingleQuestionEnforcerService {
  constructor(private readonly configService: ConfigService) {}

  getDirective(): null | QualityDirective {
    const enabled = this.configService.get<string>(
      'DIALOGUE_QUALITY_SINGLE_QUESTION_ENABLED',
      'true',
    );
    if (enabled !== 'true') {
      return null;
    }

    return {
      instruction:
        'SINGLE QUESTION RULE: Ask exactly ONE question per response. ' +
        'Multiple questions cause cognitive overload and paralysis. ' +
        'If you need to ask follow-up questions, wait for the user to respond first.',
      priority: 10,
      source: 'single-question',
    };
  }
}
