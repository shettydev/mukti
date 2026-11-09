import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../../schemas/user.schema';
import { AiModule } from '../ai/ai.module';
import { DataDisclosureController } from './data-disclosure.controller';

/** The in-app "Your data and costs" disclosure (data-flow-disclosure). */
@Module({
  controllers: [DataDisclosureController],
  imports: [
    AiModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
})
export class DataDisclosureModule {}
