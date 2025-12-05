import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { User, UserSchema } from '../../schemas/user.schema';
import { CanvasController } from './canvas.controller';
import { CanvasService } from './canvas.service';

/**
 * Canvas module for managing Thinking Canvas sessions.
 *
 * @remarks
 * This module provides:
 * - Canvas session CRUD operations
 * - Problem structure management (Seed, Soil, Roots)
 * - User association for canvas sessions
 * - Node dialogue management for context-aware chat
 */
@Module({
  controllers: [CanvasController],
  exports: [CanvasService],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: DialogueMessage.name, schema: DialogueMessageSchema },
      { name: NodeDialogue.name, schema: NodeDialogueSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [CanvasService],
})
export class CanvasModule {}
