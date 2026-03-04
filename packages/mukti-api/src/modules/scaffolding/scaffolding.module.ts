import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Concept, ConceptSchema } from '../../schemas/concept.schema';
import {
  KnowledgeState,
  KnowledgeStateSchema,
} from '../../schemas/knowledge-state.schema';
import { KnowledgeTracingModule } from '../knowledge-tracing/knowledge-tracing.module';
import { KnowledgeGapDetectorService } from './services/knowledge-gap-detector.service';
import { PrerequisiteCheckerService } from './services/prerequisite-checker.service';
import { ResponseEvaluatorService } from './services/response-evaluator.service';
import { ScaffoldFadeService } from './services/scaffold-fade.service';
import { ScaffoldPromptAugmenter } from './services/scaffold-prompt-augmenter.service';

/**
 * Scaffolding Module - RFC-0001 & RFC-0002
 *
 * Implements the Knowledge Gap Detection System and Adaptive Scaffolding Framework
 * for Mukti's Socratic dialogue platform.
 *
 * Core Features:
 * - Multi-signal knowledge gap detection (linguistic, behavioral, temporal, BKT)
 * - 5-level progressive scaffolding (Pure Socratic → Direct Instruction)
 * - Recursive prerequisite checking (depth=3)
 * - Dynamic scaffold fading (2-success/2-failure rules)
 * - Response quality evaluation for progress tracking
 *
 * Integration Points:
 * - DialogueQueueService: Gap detection before AI generation
 * - PromptBuilder: Scaffold prompt augmentation
 * - NodeDialogue schema: Scaffold state persistence
 *
 * Exports:
 * - KnowledgeGapDetectorService: Main gap detection entry point
 * - ScaffoldPromptAugmenter: Prompt augmentation for AI
 * - ScaffoldFadeService: Level transition management
 * - ResponseEvaluatorService: Response quality assessment
 * - PrerequisiteCheckerService: Prerequisite graph traversal
 *
 * @remarks
 * This module requires:
 * - KnowledgeTracingModule: For BKT algorithm and knowledge state
 * - Concept collection: For prerequisite graph
 * - NodeDialogue schema modifications: For scaffold state persistence
 */
@Module({
  exports: [
    KnowledgeGapDetectorService,
    PrerequisiteCheckerService,
    ScaffoldPromptAugmenter,
    ScaffoldFadeService,
    ResponseEvaluatorService,
  ],
  imports: [
    MongooseModule.forFeature([
      { name: KnowledgeState.name, schema: KnowledgeStateSchema },
      { name: Concept.name, schema: ConceptSchema },
    ]),
    forwardRef(() => KnowledgeTracingModule),
  ],
  providers: [
    KnowledgeGapDetectorService,
    PrerequisiteCheckerService,
    ScaffoldPromptAugmenter,
    ScaffoldFadeService,
    ResponseEvaluatorService,
  ],
})
export class ScaffoldingModule {}
