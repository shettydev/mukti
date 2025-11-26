import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

import { Public } from '../auth/decorators/public.decorator';
import {
  ApiHealthCheck,
  ApiLivenessProbe,
  ApiReadinessProbe,
} from './dto/health.swagger';

/**
 * Health check controller for monitoring application status.
 * Provides endpoints to check the health of the application and its dependencies.
 */
@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: MongooseHealthIndicator,
  ) {}

  /**
   * Comprehensive health check endpoint.
   * Checks the status of the application and MongoDB connection.
   *
   * @returns Health check results including database status
   *
   * @example
   * GET /health
   * Response:
   * {
   *   "status": "ok",
   *   "info": {
   *     "database": {
   *       "status": "up"
   *     }
   *   },
   *   "error": {},
   *   "details": {
   *     "database": {
   *       "status": "up"
   *     }
   *   }
   * }
   */
  @ApiHealthCheck()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }

  /**
   * Simple liveness probe endpoint.
   * Returns 200 OK if the application is running.
   * Useful for Kubernetes liveness probes.
   *
   * @returns Simple status object
   *
   * @example
   * GET /health/live
   * Response: { "status": "ok" }
   */
  @ApiLivenessProbe()
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /**
   * Readiness probe endpoint.
   * Checks if the application is ready to accept traffic.
   * Verifies database connectivity.
   *
   * @returns Health check results for readiness
   *
   * @example
   * GET /health/ready
   * Response:
   * {
   *   "status": "ok",
   *   "info": {
   *     "database": {
   *       "status": "up"
   *     }
   *   }
   * }
   */
  @ApiReadinessProbe()
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
    ]);
  }
}
