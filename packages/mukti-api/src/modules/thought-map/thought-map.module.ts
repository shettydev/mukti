import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CanvasSession,
  CanvasSessionSchema,
} from '../../schemas/canvas-session.schema';
import {
  Conversation,
  ConversationSchema,
} from '../../schemas/conversation.schema';
import {
  DialogueMessage,
  DialogueMessageSchema,
} from '../../schemas/dialogue-message.schema';
import {
  NodeDialogue,
  NodeDialogueSchema,
} from '../../schemas/node-dialogue.schema';
import {
  ThoughtMapShareLink,
  ThoughtMapShareLinkSchema,
} from '../../schemas/thought-map-share-link.schema';
import { ThoughtMap, ThoughtMapSchema } from '../../schemas/thought-map.schema';
import {
  ThoughtNode,
  ThoughtNodeSchema,
} from '../../schemas/thought-node.schema';
import { UsageEvent, UsageEventSchema } from '../../schemas/usage-event.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AiModule } from '../ai/ai.module';
import { DialogueModule } from '../dialogue/dialogue.module';
import { ScaffoldingModule } from '../scaffolding/scaffolding.module';
import { BranchSuggestionService } from './services/branch-suggestion.service';
import { MapExtractionService } from './services/map-extraction.service';
import { ThoughtMapDialogueQueueService } from './services/thought-map-dialogue-queue.service';
import { ThoughtMapShareService } from './services/thought-map-share.service';
import { ThoughtMapService } from './services/thought-map.service';
import { ThoughtMapDialogueController } from './thought-map-dialogue.controller';
import { ThoughtMapController } from './thought-map.controller';

/**
 * Module for managing Thought Maps, their nodes, and per-node Socratic dialogue.
 *
 * @remarks
 * This module provides:
 * - Thought Map CRUD operations (list, create, get with nodes)
 * - ThoughtNode management (add, update, delete with optional cascade)
 * - Ownership validation on all map operations
 * - Per-node Socratic dialogue via BullMQ queue + SSE streaming (Phase 2)
 * - AI branch suggestions via BullMQ queue + SSE streaming (Phase 3)
 * - Conversation → Thought Map extraction via BullMQ queue + SSE streaming (Phase 4)
 */
@Module({
  controllers: [ThoughtMapController, ThoughtMapDialogueController],
  exports: [ThoughtMapService],
  imports: [
    AiModule,
    DialogueModule,
    ScaffoldingModule,
    MongooseModule.forFeature([
      { name: ThoughtMap.name, schema: ThoughtMapSchema },
      { name: ThoughtNode.name, schema: ThoughtNodeSchema },
      { name: NodeDialogue.name, schema: NodeDialogueSchema },
      { name: DialogueMessage.name, schema: DialogueMessageSchema },
      { name: UsageEvent.name, schema: UsageEventSchema },
      { name: User.name, schema: UserSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: ThoughtMapShareLink.name, schema: ThoughtMapShareLinkSchema },
    ]),
    BullModule.registerQueue({
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          delay: 1000,
          type: 'exponential',
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
      name: 'thought-map-dialogue-requests',
    }),
    BullModule.registerQueue({
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          delay: 500,
          type: 'exponential',
        },
        removeOnComplete: {
          age: 6 * 3600,
          count: 500,
        },
        removeOnFail: {
          age: 24 * 3600,
        },
      },
      name: 'thought-map-suggestion-requests',
    }),
    BullModule.registerQueue({
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          delay: 1000,
          type: 'exponential',
        },
        removeOnComplete: {
          age: 6 * 3600,
          count: 500,
        },
        removeOnFail: {
          age: 48 * 3600,
        },
      },
      name: 'thought-map-extraction-requests',
    }),
  ],
  providers: [
    ThoughtMapService,
    ThoughtMapShareService,
    ThoughtMapDialogueQueueService,
    BranchSuggestionService,
    MapExtractionService,
  ],
})
export class ThoughtMapModule {}
