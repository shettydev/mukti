import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../core/database/database.module';
import { SeedService } from './seed.service';

@Module({
  exports: [SeedService],
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    DatabaseModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
