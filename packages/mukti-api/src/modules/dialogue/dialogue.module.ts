import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QueueModule } from '../../core/queue/queue.module';
import {
  CanvasSession,
  CanvasSessionSchema,
} from '../../schemas/canvas-session.schema';
import {
  DialogueMessage,
  DialogueMessageSchema,
} from '../../schemas/dialogue-message.schema';
import {
  NodeDialogue,
  NodeDialogueSchema,
} from '../../schemas/node-dialogue.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { UsageEvent, UsageEventSchema } from '../../schemas/usage-event.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AiModule } from '../ai/ai.module';
import { DialogueQualityModule } from '../dialogue-quality/dialogue-quality.module';
import { ScaffoldingModule } from '../scaffolding/scaffolding.module';
import { DialogueController } from './dialogue.controller';
import { DialogueAIService } from './services/dialogue-ai.service';
import { DialogueQueueService } from './services/dialogue-queue.service';
import { DialogueStreamService } from './services/dialogue-stream.service';
import { DialogueService } from './services/dialogue.service';
/**
 * Dialogue module for managing context-aware chat on canvas nodes.
 *
 * @remarks
 * This module provides:
 * - Node dialogue CRUD operations
 * - Message management with pagination
 * - AI-powered Socratic questioning via OpenRouter
 * - Integration with canvas sessions for context
 * - Asynchronous request processing via BullMQ
 * - Real-time updates via SSE
 */
@Module({
  controllers: [DialogueController],
  exports: [
    DialogueAIService,
    DialogueQueueService,
    DialogueService,
    DialogueStreamService,
  ],
  imports: [
    ConfigModule,
    AiModule,
    DialogueQualityModule,
    ScaffoldingModule,
    MongooseModule.forFeature([
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: DialogueMessage.name, schema: DialogueMessageSchema },
      { name: NodeDialogue.name, schema: NodeDialogueSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: UsageEvent.name, schema: UsageEventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // Register dialogue-requests queue (Redis connection provided by CoreModule)
    QueueModule.registerQueue('dialogue-requests'),
  ],
  providers: [
    DialogueAIService,
    DialogueQueueService,
    DialogueService,
    DialogueStreamService,
  ],
})
export class DialogueModule {}
