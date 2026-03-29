import { BullModule } from '@nestjs/bullmq';
import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Default job options applied to all queues unless overridden.
 * Provides sensible retry, backoff, and cleanup defaults.
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    delay: 1000,
    type: 'exponential' as const,
  },
  removeOnComplete: {
    age: 24 * 3600, // 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // 7 days
  },
};

/**
 * Options for registering a named queue with optional job defaults.
 */
export interface RegisterQueueOptions {
  attempts?: number;
  backoff?: {
    delay: number;
    type: 'exponential' | 'fixed';
  };
  removeOnComplete?: {
    age: number;
    count: number;
  };
  removeOnFail?: {
    age: number;
  };
}

/**
 * Centralized BullMQ queue configuration module.
 *
 * - `forRoot()` — Configures the Redis connection once (global).
 *   Replaces duplicate `BullModule.forRootAsync()` calls across modules.
 *
 * - `registerQueue(name, options?)` — Registers a named queue with
 *   sensible default job options. Per-queue overrides are merged on top.
 */
@Module({})
export class QueueModule {
  /**
   * Configure the BullMQ Redis connection globally.
   * Call once in CoreModule — all domain modules inherit the connection.
   */
  static forRoot(): DynamicModule {
    return {
      exports: [BullModule],
      global: true,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const password = configService
              .get<string>('REDIS_PASSWORD')
              ?.trim();

            return {
              connection: {
                db: configService.get<number>('REDIS_DB', 0),
                host: configService.get<string>('REDIS_HOST', 'localhost'),
                port: configService.get<number>('REDIS_PORT', 6379),
                ...(password ? { password } : {}),
              },
            };
          },
        }),
      ],
      module: QueueModule,
    };
  }

  /**
   * Register a named queue with default job options.
   * Overrides are deep-merged with defaults.
   */
  static registerQueue(
    name: string,
    options?: RegisterQueueOptions,
  ): DynamicModule {
    return BullModule.registerQueue({
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        ...options,
        backoff: {
          ...DEFAULT_JOB_OPTIONS.backoff,
          ...options?.backoff,
        },
        removeOnComplete: {
          ...DEFAULT_JOB_OPTIONS.removeOnComplete,
          ...options?.removeOnComplete,
        },
        removeOnFail: {
          ...DEFAULT_JOB_OPTIONS.removeOnFail,
          ...options?.removeOnFail,
        },
      },
      name,
    });
  }
}
