import { Inject, Module, type OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { AiModule } from '../ai/ai.module';
import { BreakthroughDetectorService } from './services/breakthrough-detector.service';
import { DialogueQualityService } from './services/dialogue-quality.service';
import { MisconceptionDetectorService } from './services/misconception-detector.service';
import { PostResponseMonitorService } from './services/post-response-monitor.service';
import { SingleQuestionEnforcerService } from './services/single-question-enforcer.service';

@Module({
  exports: [DialogueQualityService, PostResponseMonitorService],
  imports: [ConfigModule, AiModule],
  providers: [
    DialogueQualityService,
    MisconceptionDetectorService,
    BreakthroughDetectorService,
    SingleQuestionEnforcerService,
    PostResponseMonitorService,
    {
      inject: [ConfigService],
      provide: 'QUALITY_REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('REDIS_PASSWORD')?.trim();

        return new Redis({
          db: configService.get<number>('REDIS_DB', 0),
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          keyPrefix: 'mukti:quality:',
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          port: configService.get<number>('REDIS_PORT', 6379),
          ...(password ? { password } : {}),
        });
      },
    },
  ],
})
export class DialogueQualityModule implements OnModuleDestroy {
  constructor(
    @Optional()
    @Inject('QUALITY_REDIS_CLIENT')
    private readonly redis?: Redis,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis?.status === 'ready') {
      await this.redis.quit();
    }
  }
}
