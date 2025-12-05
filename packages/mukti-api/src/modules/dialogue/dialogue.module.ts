import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

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
import { UsageEvent, UsageEventSchema } from '../../schemas/usage-event.schema';
import { DialogueAIService } from './dialogue-ai.service';
import { DialogueController } from './dialogue.controller';
import { DialogueService } from './dialogue.service';
import { DialogueQueueService } from './services/dialogue-queue.service';
import { DialogueStreamService } from './services/dialogue-stream.service';

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
    MongooseModule.forFeature([
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: DialogueMessage.name, schema: DialogueMessageSchema },
      { name: NodeDialogue.name, schema: NodeDialogueSchema },
      { name: UsageEvent.name, schema: UsageEventSchema },
    ]),
    // Configure BullMQ queue for dialogue requests
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
    // Register dialogue-requests queue
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
      name: 'dialogue-requests',
    }),
  ],
  providers: [
    DialogueAIService,
    DialogueQueueService,
    DialogueService,
    DialogueStreamService,
  ],
})
export class DialogueModule {}
