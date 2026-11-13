import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ALL_SCHEMAS } from '../../schemas';
import { AuthModule } from '../auth/auth.module';
import { UserDataController } from './user-data.controller';
import { UserDataService } from './user-data.service';

@Module({
  controllers: [UserDataController],
  exports: [UserDataService],
  imports: [AuthModule, MongooseModule.forFeature(ALL_SCHEMAS)],
  providers: [UserDataService],
})
export class UserDataModule {}
