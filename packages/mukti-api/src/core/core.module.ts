import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { StreamBusModule } from './stream-bus/stream-bus.module';

/**
 * Core infrastructure module — imported once in AppModule.
 *
 * Bundles cross-cutting infrastructure concerns:
 * - **DatabaseModule** — MongoDB connection + schema registration
 * - **QueueModule.forRoot()** — Global BullMQ/Redis connection
 * - **StreamBusModule.forRoot()** — Global cross-instance bus for live
 *   (SSE) events, so a job's events reach the instance holding the client
 *
 * Domain modules should NOT import CoreModule directly.
 * They consume the global Redis connection automatically and
 * register their own queues via `QueueModule.registerQueue()`.
 */
@Module({
  exports: [DatabaseModule, QueueModule, StreamBusModule],
  imports: [DatabaseModule, QueueModule.forRoot(), StreamBusModule.forRoot()],
})
export class CoreModule {}
