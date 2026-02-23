import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Waitlist, WaitlistSchema } from '../../schemas/waitlist.schema';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

@Module({
  controllers: [WaitlistController],
  exports: [WaitlistService],
  imports: [
    MongooseModule.forFeature([
      { name: Waitlist.name, schema: WaitlistSchema },
    ]),
  ],
  providers: [WaitlistService],
})
export class WaitlistModule {}
