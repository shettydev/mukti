import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { User } from '../../schemas/user.schema';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateThoughtMapDto } from './dto/create-thought-map.dto';
import { CreateThoughtNodeDto } from './dto/create-thought-node.dto';
import { UpdateThoughtNodeDto } from './dto/update-thought-node.dto';
import { ThoughtMapService } from './thought-map.service';
import {
  ApiAddThoughtNode,
  ApiCreateThoughtMap,
  ApiDeleteThoughtNode,
  ApiGetThoughtMap,
  ApiListThoughtMaps,
  ApiUpdateThoughtNode,
} from './thought-map.swagger';

/**
 * Controller for Thought Map endpoints.
 *
 * @remarks
 * All endpoints require JWT authentication via the global APP_GUARD.
 * Implements the 6 Phase-1 endpoints for the ThoughtMap feature.
 */
@ApiTags('Thought Maps')
@Controller('thought-maps')
@UseGuards(JwtAuthGuard)
export class ThoughtMapController {
  constructor(private readonly thoughtMapService: ThoughtMapService) {}

  /**
   * Creates a new Thought Map with a root topic node.
   */
  @ApiCreateThoughtMap()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async createMap(@Body() dto: CreateThoughtMapDto, @CurrentUser() user: User) {
    const result = await this.thoughtMapService.createMap(user._id, dto);
    return {
      data: result,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Lists all Thought Maps for the authenticated user.
   */
  @ApiListThoughtMaps()
  @Get()
  async listMaps(@CurrentUser() user: User) {
    const maps = await this.thoughtMapService.listMaps(user._id);
    return {
      data: maps,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Retrieves a specific Thought Map with all its nodes.
   */
  @ApiGetThoughtMap()
  @Get(':id')
  async getMap(@Param('id') id: string, @CurrentUser() user: User) {
    const result = await this.thoughtMapService.getMap(id, user._id);
    return {
      data: result,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Adds a new ThoughtNode to an existing Thought Map.
   */
  @ApiAddThoughtNode()
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/nodes')
  async addNode(
    @Param('id') id: string,
    @Body() dto: CreateThoughtNodeDto,
    @CurrentUser() user: User,
  ) {
    const node = await this.thoughtMapService.addNode(id, user._id, dto);
    return {
      data: node,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Updates an existing ThoughtNode (label, position, collapsed state).
   */
  @ApiUpdateThoughtNode()
  @HttpCode(HttpStatus.OK)
  @Patch(':id/nodes/:nodeId')
  async updateNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateThoughtNodeDto,
    @CurrentUser() user: User,
  ) {
    const node = await this.thoughtMapService.updateNode(
      id,
      nodeId,
      user._id,
      dto,
    );
    return {
      data: node,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Deletes a ThoughtNode, optionally cascading to all descendants.
   */
  @ApiDeleteThoughtNode()
  @Delete(':id/nodes/:nodeId')
  @HttpCode(HttpStatus.OK)
  async deleteNode(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Query('cascade') cascade: string,
    @CurrentUser() user: User,
  ) {
    // Treat any truthy string value of 'cascade' as true
    const shouldCascade = cascade === 'true' || cascade === '1';
    await this.thoughtMapService.deleteNode(
      id,
      nodeId,
      user._id,
      shouldCascade,
    );
    return {
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Generates a unique request ID for response envelope tracing.
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
