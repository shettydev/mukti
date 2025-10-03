import { Module } from '@nestjs/common';

import { SocraticInquiryModule } from '../socratic-inquiry/socratic-inquiry.module';
import { ThinkingSessionController } from './thinking-session.controller';
import { ThinkingSessionService } from './thinking-session.service';

@Module({
  imports: [SocraticInquiryModule],
  controllers: [ThinkingSessionController],
  providers: [ThinkingSessionService],
  exports: [ThinkingSessionService],
})
export class ThinkingSessionModule {}
