import { Module } from '@nestjs/common';

import { SocraticInquiryController } from './socratic-inquiry.controller';
import { SocraticInquiryService } from './socratic-inquiry.service';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [SocraticInquiryController],
  providers: [SocraticInquiryService],
  exports: [SocraticInquiryService],
})
export class SocraticInquiryModule {}
