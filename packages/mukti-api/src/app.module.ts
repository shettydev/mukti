import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { DatabaseModule } from './modules/database/database.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    DatabaseModule,
    ConversationsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
