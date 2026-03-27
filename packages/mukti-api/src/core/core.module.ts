import { Module } from '@nestjs/common';

import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';

/**
 * Core infrastructure module — imported once in AppModule.
 *
 * Bundles cross-cutting infrastructure concerns:
 * - **DatabaseModule** — MongoDB connection + schema registration
 * - **QueueModule.forRoot()** — Global BullMQ/Redis connection
 *
 * Domain modules should NOT import CoreModule directly.
 * They consume the global Redis connection automatically and
 * register their own queues via `QueueModule.registerQueue()`.
 */
@Module({
  exports: [DatabaseModule, QueueModule],
  imports: [DatabaseModule, QueueModule.forRoot()],
})
export class CoreModule {}
