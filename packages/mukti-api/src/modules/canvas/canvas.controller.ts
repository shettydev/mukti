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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { User } from '../../schemas/user.schema';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CanvasService } from './canvas.service';
import {
  AddAssumptionDto,
  AddContextDto,
  CreateInsightNodeDto,
  CreateRelationshipDto,
  UpdateInsightNodeDto,
} from './dto';
import { CanvasSessionResponseDto } from './dto/canvas-session-response.dto';
import {
  ApiAddAssumption,
  ApiAddContext,
  ApiCreateCanvasSession,
  ApiCreateInsight,
  ApiCreateRelationship,
  ApiDeleteAssumption,
  ApiDeleteContext,
  ApiDeleteInsight,
  ApiDeleteRelationship,
  ApiDeleteSession,
  ApiGetCanvasSessionById,
  ApiGetCanvasSessions,
  ApiGetInsights,
  ApiUpdateCanvasSession,
  ApiUpdateInsight,
} from './dto/canvas.swagger';
import { CreateCanvasSessionDto } from './dto/create-canvas-session.dto';
import { UpdateCanvasSessionDto } from './dto/update-canvas-session.dto';

/**
 * Controller for canvas session management endpoints.
 * Handles CRUD operations for Thinking Canvas sessions.
 *
 * @remarks
 * All endpoints require JWT authentication.
 * Implements the Setup Wizard backend for the Thinking Canvas feature.
 */
@ApiTags('Canvas')
@Controller('canvas')
@UseGuards(JwtAuthGuard)
export class CanvasController {
  constructor(private readonly canvasService: CanvasService) {}

  /**
   * Adds a new assumption (Root node) to a canvas session.
   */
  @ApiAddAssumption()
  @HttpCode(HttpStatus.OK)
  @Post('sessions/:id/assumptions')
  async addAssumption(
    @Param('id') id: string,
    @Body() dto: AddAssumptionDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.canvasService.addAssumption(id, user._id, dto);
    return CanvasSessionResponseDto.fromDocument(result.session);
  }

  /**
   * Adds a new context item (Soil node) to a canvas session.
   */
  @ApiAddContext()
  @HttpCode(HttpStatus.OK)
  @Post('sessions/:id/context')
  async addContext(
    @Param('id') id: string,
    @Body() dto: AddContextDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.canvasService.addContext(id, user._id, dto);
    return CanvasSessionResponseDto.fromDocument(result.session);
  }

  /**
   * Creates a new insight node.
   */
  @ApiCreateInsight()
  @HttpCode(HttpStatus.CREATED)
  @Post('sessions/:id/insights')
  async createInsight(
    @Param('id') id: string,
    @Body() dto: CreateInsightNodeDto,
    @CurrentUser() user: User,
  ) {
    const insight = await this.canvasService.createInsightNode(
      id,
      user._id,
      dto,
    );
    return insight;
  }

  /**
   * Updates an insight node.
   */
  @ApiUpdateInsight()
  @HttpCode(HttpStatus.OK)
  @Patch('sessions/:id/insights/:nodeId')
  async updateInsight(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateInsightNodeDto,
    @CurrentUser() user: User,
  ) {
    const insight = await this.canvasService.updateInsightNode(
      id,
      nodeId,
      user._id,
      dto,
    );
    return insight;
  }

  /**
   * Creates a relationship edge.
   */
  @ApiCreateRelationship()
  @HttpCode(HttpStatus.CREATED)
  @Post('sessions/:id/relationships')
  async createRelationship(
    @Param('id') id: string,
    @Body() dto: CreateRelationshipDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.canvasService.createRelationship(
      id,
      user._id,
      dto,
    );
    return CanvasSessionResponseDto.fromDocument(result.session);
  }

  /**
   * Creates a new canvas session with the problem structure.
   *
   * @param createCanvasSessionDto - The canvas session creation data
   * @param user - The authenticated user from JWT token
   * @returns The newly created canvas session
   */
  @ApiCreateCanvasSession()
  @HttpCode(HttpStatus.CREATED)
  @Post('sessions')
  async createSession(
    @Body() createCanvasSessionDto: CreateCanvasSessionDto,
    @CurrentUser() user: User,
  ) {
    const session = await this.canvasService.createSession(
      user._id,
      createCanvasSessionDto,
    );

    return CanvasSessionResponseDto.fromDocument(session);
  }

  /**
   * Deletes a canvas session and all associated insight nodes.
   *
   * @param id - The canvas session ID
   * @param user - The authenticated user from JWT token
   * @returns Success response
   */
  @ApiDeleteSession()
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  async deleteSession(@Param('id') id: string, @CurrentUser() user: User) {
    await this.canvasService.deleteSession(id, user._id);
  }

  // ============================================
  // Dynamic Node Endpoints
  // ============================================

  /**
   * Deletes a dynamically-added assumption.
   */
  @ApiDeleteAssumption()
  @Delete('sessions/:id/assumptions/:index')
  @HttpCode(HttpStatus.OK)
  async deleteAssumption(
    @Param('id') id: string,
    @Param('index') index: number,
    @CurrentUser() user: User,
  ) {
    const session = await this.canvasService.deleteAssumption(
      id,
      index,
      user._id,
    );
    return CanvasSessionResponseDto.fromDocument(session);
  }

  /**
   * Deletes a dynamically-added context item.
   */
  @ApiDeleteContext()
  @Delete('sessions/:id/context/:index')
  @HttpCode(HttpStatus.OK)
  async deleteContext(
    @Param('id') id: string,
    @Param('index') index: number,
    @CurrentUser() user: User,
  ) {
    const session = await this.canvasService.deleteContext(id, index, user._id);
    return CanvasSessionResponseDto.fromDocument(session);
  }

  /**
   * Deletes an insight node.
   */
  @ApiDeleteInsight()
  @Delete('sessions/:id/insights/:nodeId')
  @HttpCode(HttpStatus.OK)
  async deleteInsight(
    @Param('id') id: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
  ) {
    await this.canvasService.deleteInsightNode(id, nodeId, user._id);
  }

  /**
   * Deletes a relationship edge.
   */
  @ApiDeleteRelationship()
  @Delete('sessions/:id/relationships/:relationshipId')
  @HttpCode(HttpStatus.OK)
  async deleteRelationship(
    @Param('id') id: string,
    @Param('relationshipId') relationshipId: string,
    @CurrentUser() user: User,
  ) {
    const session = await this.canvasService.deleteRelationship(
      id,
      relationshipId,
      user._id,
    );
    return CanvasSessionResponseDto.fromDocument(session);
  }

  // ============================================
  // Insight Node Endpoints
  // ============================================

  /**
   * Retrieves all canvas sessions for the authenticated user.
   *
   * @param user - The authenticated user from JWT token
   * @returns Array of canvas sessions
   */
  @ApiGetCanvasSessions()
  @Get('sessions')
  async findAll(@CurrentUser() user: User) {
    const sessions = await this.canvasService.findAllByUser(user._id);

    return sessions.map((session) =>
      CanvasSessionResponseDto.fromDocument(session),
    );
  }

  /**
   * Retrieves a specific canvas session by ID with ownership validation.
   *
   * @param id - The canvas session ID
   * @param user - The authenticated user from JWT token
   * @returns The canvas session
   */
  @ApiGetCanvasSessionById()
  @Get('sessions/:id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const session = await this.canvasService.findSessionById(id, user._id);

    return CanvasSessionResponseDto.fromDocument(session);
  }

  /**
   * Gets all insight nodes for a session.
   */
  @ApiGetInsights()
  @Get('sessions/:id/insights')
  async getInsights(@Param('id') id: string, @CurrentUser() user: User) {
    const insights = await this.canvasService.getInsightsBySession(
      id,
      user._id,
    );
    return insights;
  }

  // ============================================
  // Relationship Endpoints
  // ============================================

  /**
   * Updates a canvas session with new node positions or explored nodes.
   *
   * @param id - The canvas session ID
   * @param updateCanvasSessionDto - The update data
   * @param user - The authenticated user from JWT token
   * @returns The updated canvas session
   */
  @ApiUpdateCanvasSession()
  @HttpCode(HttpStatus.OK)
  @Patch('sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() updateCanvasSessionDto: UpdateCanvasSessionDto,
    @CurrentUser() user: User,
  ) {
    const session = await this.canvasService.updateSession(
      id,
      user._id,
      updateCanvasSessionDto,
    );

    return CanvasSessionResponseDto.fromDocument(session);
  }
}
