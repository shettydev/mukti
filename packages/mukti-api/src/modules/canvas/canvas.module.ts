import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CanvasSession,
  CanvasSessionSchema,
} from '../../schemas/canvas-session.schema';
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
 */
@Module({
  controllers: [CanvasController],
  exports: [CanvasService],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [CanvasService],
})
export class CanvasModule {}
