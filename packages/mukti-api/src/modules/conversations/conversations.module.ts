import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

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
import { ConversationController } from './conversation.controller';
import { ConversationService } from './services/conversation.service';
import { MessageService } from './services/message.service';
import { QueueService } from './services/queue.service';
import { SeedService } from './services/seed.service';
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
    SeedService,
    ConversationService,
    MessageService,
    QueueService,
    StreamService,
  ],
  imports: [
    ConfigModule,
    AiModule,
    // Register Mongoose schemas
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ArchivedMessage.name, schema: ArchivedMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Technique.name, schema: TechniqueSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: UsageEvent.name, schema: UsageEventSchema },
    ]),
    // Configure BullMQ queue for conversation requests
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          db: configService.get<number>('REDIS_DB', 0),
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          password: configService.get<string>('REDIS_PASSWORD'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    // Register conversation-requests queue
    BullModule.registerQueue({
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          delay: 1000,
          type: 'exponential',
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days
        },
      },
      name: 'conversation-requests',
    }),
  ],
  providers: [
    SeedService,
    ConversationService,
    MessageService,
    QueueService,
    StreamService,
  ],
})
export class ConversationsModule {}
