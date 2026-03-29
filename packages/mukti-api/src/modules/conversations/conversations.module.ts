import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QueueModule } from '../../core/queue/queue.module';
import {
  ArchivedMessage,
  ArchivedMessageSchema,
} from '../../schemas/archived-message.schema';
import {
  Conversation,
  ConversationSchema,
} from '../../schemas/conversation.schema';
import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { Technique, TechniqueSchema } from '../../schemas/technique.schema';
import { UsageEvent, UsageEventSchema } from '../../schemas/usage-event.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AiModule } from '../ai/ai.module';
import { DialogueQualityModule } from '../dialogue-quality/dialogue-quality.module';
import { ScaffoldingModule } from '../scaffolding/scaffolding.module';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { OpenRouterService } from './services/openrouter.service';
import { QueueService } from './services/queue.service';
import { StreamService } from './services/stream.service';

/**
 * Conversations module implementing the Thinking Workspace paradigm.
 * Handles Socratic dialogue sessions with AI through OpenRouter.
 *
 * @remarks
 * This module provides:
 * - Conversation CRUD operations
 * - Message management and archival
 * - Asynchronous AI request processing via BullMQ
 * - Usage tracking and analytics
 * - Rate limiting and quota enforcement
 * - Database seeding for initial data
 */
@Module({
  controllers: [ConversationController],
  exports: [
    ConversationService,
    MessageService,
    OpenRouterService,
    QueueService,
    StreamService,
  ],
  imports: [
    ConfigModule,
    AiModule,
    DialogueQualityModule,
    ScaffoldingModule,
    // Register Mongoose schemas
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ArchivedMessage.name, schema: ArchivedMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Technique.name, schema: TechniqueSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: UsageEvent.name, schema: UsageEventSchema },
    ]),
    // Register conversation-requests queue (Redis connection provided by CoreModule)
    QueueModule.registerQueue('conversation-requests'),
  ],
  providers: [
    ConversationService,
    MessageService,
    OpenRouterService,
    QueueService,
    StreamService,
  ],
})
export class ConversationsModule {}
