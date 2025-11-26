import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';

/**
 * Health module for application monitoring.
 * Provides health check endpoints for monitoring application status.
 */
@Module({
  controllers: [HealthController],
  imports: [TerminusModule],
})
export class HealthModule {}
