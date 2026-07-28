import {
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { mkdirSync } from 'fs';
import { type Connection, type Model } from 'mongoose';
import { resolve } from 'path';

import { isLocalMode, LOCAL_DB_PATH } from '../../common/config/local-mode';
import { ALL_SCHEMAS } from '../../schemas';
import { NodeDialogue } from '../../schemas/node-dialogue.schema';

/**
 * Holds the embedded MongoDB server in local mode so it can be stopped on
 * shutdown. `unknown` avoids importing the type when the optional dependency
 * is absent (hosted builds never load it).
 */
let localMongoServer: undefined | { stop(): Promise<boolean> };

/**
 * Resolves the MongoDB connection URI. In local mode a file-backed
 * `mongodb-memory-server` is started under `.mukti/local-db/` so data survives
 * restarts with no Docker. Otherwise the configured/hosted URI is used.
 */
async function resolveMongoUri(configService: ConfigService): Promise<string> {
  if (isLocalMode()) {
    // The launcher passes MUKTI_LOCAL_DB_PATH so data lands at the repo root
    // regardless of the process cwd; fall back to cwd-relative otherwise.
    const dbPath =
      process.env.MUKTI_LOCAL_DB_PATH ?? resolve(process.cwd(), LOCAL_DB_PATH);
    mkdirSync(dbPath, { recursive: true });

    // Dynamic import keeps the dev-only dependency out of the hosted path.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const server = await MongoMemoryServer.create({
      instance: { dbName: 'mukti', dbPath, storageEngine: 'wiredTiger' },
    });
    localMongoServer = server;
    return server.getUri();
  }

  return (
    configService.get<string>('MONGODB_URI') ??
    'mongodb://localhost:27017/mukti'
  );
}

@Module({
  exports: [MongooseModule],
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');

        const uri = await resolveMongoUri(configService);
        const dbName = isLocalMode()
          ? undefined
          : configService.get<string>('MONGODB_DB_NAME');
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
export class DatabaseModule implements OnApplicationShutdown, OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @InjectModel(NodeDialogue.name)
    private readonly nodeDialogueModel: Model<NodeDialogue>,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    if (localMongoServer) {
      await localMongoServer.stop();
      this.logger.log('Embedded MongoDB stopped');
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.nodeDialogueModel.syncIndexes();
      this.logger.log('NodeDialogue indexes synced successfully');
    } catch (error) {
      this.logger.error('Failed to sync NodeDialogue indexes', error);
    }
  }
}
