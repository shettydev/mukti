import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';

import {
  KnowledgeState,
  KnowledgeStateSchema,
} from '../../schemas/knowledge-state.schema';
import { KnowledgeTracingController } from './knowledge-tracing.controller';
import { BKTAlgorithmService } from './services/bkt-algorithm.service';
import { KnowledgeStateTrackerService } from './services/knowledge-state-tracker.service';

/**
 * Knowledge Tracing Module
 *
 * Implements Bayesian Knowledge Tracing (BKT) for user knowledge state estimation.
 *
 * Features:
 * - BKT algorithm implementation (4-parameter model)
 * - Knowledge state persistence with MongoDB
 * - In-memory caching for performance
 * - Event emission for analytics and recommendations
 * - REST API for knowledge state management
 *
 * Exports:
 * - KnowledgeStateTrackerService (for use in other modules)
 * - BKTAlgorithmService (for direct algorithm access)
 */
@Module({
  controllers: [KnowledgeTracingController],
  exports: [BKTAlgorithmService, KnowledgeStateTrackerService],
  imports: [
    MongooseModule.forFeature([
      { name: KnowledgeState.name, schema: KnowledgeStateSchema },
    ]),
    EventEmitterModule.forRoot(),
  ],
  providers: [BKTAlgorithmService, KnowledgeStateTrackerService],
})
export class KnowledgeTracingModule {}
