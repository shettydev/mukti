import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  KnowledgeStateTrackerService,
  KnowledgeStateUpdatedEvent,
} from '../services/knowledge-state-tracker.service';

/**
 * Example: Integrating BKT with Mukti's Socratic Dialogue System
 */
@Injectable()
export class SocraticDialogueWithBKT {
  private readonly logger = new Logger(SocraticDialogueWithBKT.name);

  constructor(
    private readonly knowledgeTracker: KnowledgeStateTrackerService,
  ) {}

  @OnEvent('knowledge-state.updated')
  handleKnowledgeStateUpdate(event: KnowledgeStateUpdatedEvent) {
    this.logger.log(`Knowledge updated: ${event.userId} - ${event.conceptId}`);
  }

  async processSocraticAnswer(
    userId: string,
    conceptId: string,
    userAnswer: string,
  ) {
    void userAnswer;
    const correct = true; // Simplified evaluation
    const result = await this.knowledgeTracker.updateKnowledgeState(
      userId,
      conceptId,
      correct,
    );

    return result;
  }
}
