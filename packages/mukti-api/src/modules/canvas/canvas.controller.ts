import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import type { User } from '../../schemas/user.schema';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CanvasService } from './canvas.service';
import { CanvasSessionResponseDto } from './dto/canvas-session-response.dto';
import {
  ApiCreateCanvasSession,
  ApiGetCanvasSessionById,
  ApiGetCanvasSessions,
} from './dto/canvas.swagger';
import { CreateCanvasSessionDto } from './dto/create-canvas-session.dto';

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

    return {
      data: CanvasSessionResponseDto.fromDocument(session),
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

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

    return {
      data: sessions.map((session) =>
        CanvasSessionResponseDto.fromDocument(session),
      ),
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
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

    return {
      data: CanvasSessionResponseDto.fromDocument(session),
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Generates a unique request ID for tracking.
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
