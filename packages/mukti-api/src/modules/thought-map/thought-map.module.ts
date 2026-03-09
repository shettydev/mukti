import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ThoughtMap, ThoughtMapSchema } from '../../schemas/thought-map.schema';
import {
  ThoughtNode,
  ThoughtNodeSchema,
} from '../../schemas/thought-node.schema';
import { ThoughtMapController } from './thought-map.controller';
import { ThoughtMapService } from './thought-map.service';

/**
 * Module for managing Thought Maps and their nodes.
 *
 * @remarks
 * This module provides:
 * - Thought Map CRUD operations (list, create, get with nodes)
 * - ThoughtNode management (add, update, delete with optional cascade)
 * - Ownership validation on all map operations
 */
@Module({
  controllers: [ThoughtMapController],
  exports: [ThoughtMapService],
  imports: [
    MongooseModule.forFeature([
      { name: ThoughtMap.name, schema: ThoughtMapSchema },
      { name: ThoughtNode.name, schema: ThoughtNodeSchema },
    ]),
  ],
  providers: [ThoughtMapService],
})
export class ThoughtMapModule {}
