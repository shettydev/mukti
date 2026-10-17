import type { ConfigService } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

/**
 * Redis connection options shared by everything that talks to Redis
 * (BullMQ queues and the cross-instance stream bus), so they cannot drift.
 */
export function redisConnectionOptions(
  configService: ConfigService,
): RedisOptions {
  const password = configService.get<string>('REDIS_PASSWORD')?.trim();

  return {
    db: configService.get<number>('REDIS_DB', 0),
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    ...(password ? { password } : {}),
  };
}
