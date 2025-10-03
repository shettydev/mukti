import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { SocraticInquiryModule } from './modules/socratic-inquiry/socratic-inquiry.module';
import { ThinkingSessionModule } from './modules/thinking-session/thinking-session.module';
import { ProblemCanvasModule } from './modules/problem-canvas/problem-canvas.module';
import { SharedModule } from './modules/shared/shared.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SharedModule,
    ThinkingSessionModule,
    SocraticInquiryModule,
    ProblemCanvasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
