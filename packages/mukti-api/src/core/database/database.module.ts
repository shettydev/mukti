import { Logger, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { type Connection, type Model } from 'mongoose';

import { ALL_SCHEMAS } from '../../schemas';
import { NodeDialogue } from '../../schemas/node-dialogue.schema';

@Module({
  exports: [MongooseModule],
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        const uri =
          configService.get<string>('MONGODB_URI') ??
          'mongodb://localhost:27017/mukti';
        const dbName = configService.get<string>('MONGODB_DB_NAME');
        const serverSelectionTimeoutMS =
          Number(configService.get<string>('MONGODB_TIMEOUT_MS')) || 5000;
        const autoIndex =
          configService.get<string>('MONGODB_AUTO_INDEX')?.toLowerCase() !==
          'false';

        try {
          const parsed = new URL(uri);
          logger.log(
            `Connecting to MongoDB at ${parsed.protocol}//${parsed.hostname}${parsed.pathname}${dbName ? ` (db: ${dbName})` : ''}`,
          );
        } catch {
          logger.warn('Could not parse MongoDB URI for logging (check format)');
        }

        return {
          autoIndex,
          connectionFactory: (connection: Connection) => {
            connection.on('connected', () => {
              logger.log('✅ MongoDB connected successfully');
            });
            connection.on('error', (error: Error) => {
              logger.error('❌ MongoDB connection error', error);
            });
            connection.on('disconnected', () => {
              logger.warn('⚠️ MongoDB disconnected');
            });
            return connection;
          },
          dbName,
          retryAttempts: 3,
          retryDelay: 1000,
          serverSelectionTimeoutMS,
          uri,
        };
      },
    }),
    MongooseModule.forFeature(ALL_SCHEMAS),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @InjectModel(NodeDialogue.name)
    private readonly nodeDialogueModel: Model<NodeDialogue>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.nodeDialogueModel.syncIndexes();
      this.logger.log('NodeDialogue indexes synced successfully');
    } catch (error) {
      this.logger.error('Failed to sync NodeDialogue indexes', error);
    }
  }
}
