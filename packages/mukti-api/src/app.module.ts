import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CanvasModule } from './modules/canvas/canvas.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DatabaseModule } from './modules/database/database.module';
import { DialogueModule } from './modules/dialogue/dialogue.module';
import { HealthModule } from './modules/health/health.module';
import { KnowledgeTracingModule } from './modules/knowledge-tracing/knowledge-tracing.module';
import { ThoughtMapModule } from './modules/thought-map/thought-map.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    AiModule,
    CanvasModule,
    ConversationsModule,
    DialogueModule,
    HealthModule,
    KnowledgeTracingModule,
    ThoughtMapModule,
    WaitlistModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
