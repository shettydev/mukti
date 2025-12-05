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
import { DialogueController } from './dialogue.controller';
import { DialogueService } from './dialogue.service';

/**
 * Dialogue module for managing context-aware chat on canvas nodes.
 *
 * @remarks
 * This module provides:
 * - Node dialogue CRUD operations
 * - Message management with pagination
 * - AI prompt construction for Socratic questioning
 * - Integration with canvas sessions for context
 */
@Module({
  controllers: [DialogueController],
  exports: [DialogueService],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: DialogueMessage.name, schema: DialogueMessageSchema },
      { name: NodeDialogue.name, schema: NodeDialogueSchema },
    ]),
  ],
  providers: [DialogueService],
})
export class DialogueModule {}
