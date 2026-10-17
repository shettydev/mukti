import { type DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { isLocalMode } from '../../common/config/local-mode';
import {
  createStreamBusRedisClients,
  InProcessStreamBus,
  RedisStreamBus,
  STREAM_BUS_REDIS,
  StreamBus,
} from './stream-bus';

/**
 * Provides the global {@link StreamBus}: Redis pub/sub when hosted, in-process
 * in local mode (one process, no Redis).
 */
@Global()
@Module({})
export class StreamBusModule {
  static forRoot(): DynamicModule {
    const providers = isLocalMode()
      ? [{ provide: StreamBus, useValue: new InProcessStreamBus() }]
      : [
          {
            inject: [ConfigService],
            provide: STREAM_BUS_REDIS,
            useFactory: createStreamBusRedisClients,
          },
          { provide: StreamBus, useClass: RedisStreamBus },
        ];

    return {
      exports: [StreamBus],
      global: true,
      imports: [ConfigModule],
      module: StreamBusModule,
      providers,
    };
  }
}
