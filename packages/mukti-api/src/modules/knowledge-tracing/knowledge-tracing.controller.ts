import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Concept, ConceptDocument } from '../../schemas/concept.schema';
import { User } from '../../schemas/user.schema';
import {
  CreateConceptDto,
  ListConceptsQueryDto,
  UpdateConceptDto,
} from './dto/concept.dto';
import { UpdateKnowledgeStateDto } from './dto/update-knowledge-state.dto';
import { KnowledgeStateTrackerService } from './services/knowledge-state-tracker.service';

/**
 * Knowledge Tracing Controller
 *
 * REST API endpoints for Bayesian Knowledge Tracing (BKT) functionality.
 *
 * Endpoints:
 * - POST /knowledge-tracing/update - Update knowledge state based on response
 * - GET /knowledge-tracing/state/:userId/:conceptId - Get specific knowledge state
 * - GET /knowledge-tracing/user/:userId - Get all states for a user
 * - DELETE /knowledge-tracing/state/:userId/:conceptId/reset - Reset knowledge state
 */
@Controller('knowledge-tracing')
@SkipEnvelope()
export class KnowledgeTracingController {
  private readonly logger = new Logger(KnowledgeTracingController.name);

  constructor(
    private readonly knowledgeStateTracker: KnowledgeStateTrackerService,
    @InjectModel(Concept.name)
    private readonly conceptModel: Model<ConceptDocument>,
  ) {}

  /**
   * Update knowledge state based on a user's response.
   * userId is derived from the authenticated JWT — not accepted from the request body —
   * to prevent IDOR attacks where a caller could update another user's state.
   *
   * POST /knowledge-tracing/update
   *
   * Body:
   * {
   *   "conceptId": "algebra_linear_equations",
   *   "correct": true,
   *   "pInit": 0.3,      // optional
   *   "pLearn": 0.15,    // optional
   *   "pSlip": 0.1,      // optional
   *   "pGuess": 0.25     // optional
   * }
   *
   * Response:
   * {
   *   "state": { ... },
   *   "posteriorBeforeLearning": 0.65,
   *   "posteriorAfterLearning": 0.70,
   *   "isMastered": false,
   *   "recommendation": "practice"
   * }
   */
  @Post('update')
  async updateKnowledgeState(
    @CurrentUser() user: User,
    @Body() dto: UpdateKnowledgeStateDto,
  ) {
    const userId = user._id.toString();
    this.logger.log(
      `Update request: user=${userId}, concept=${dto.conceptId}, correct=${dto.correct}`,
    );

    const customParams = {
      ...(dto.pInit !== undefined && { pInit: dto.pInit }),
      ...(dto.pLearn !== undefined && { pLearn: dto.pLearn }),
      ...(dto.pSlip !== undefined && { pSlip: dto.pSlip }),
      ...(dto.pGuess !== undefined && { pGuess: dto.pGuess }),
    };

    const result = await this.knowledgeStateTracker.updateKnowledgeState(
      userId,
      dto.conceptId,
      dto.correct,
      Object.keys(customParams).length > 0 ? customParams : undefined,
    );

    return result;
  }

  /**
   * Get cache statistics (for debugging/monitoring).
   * Restricted to admins — cache keys embed userId:conceptId pairs.
   *
   * GET /knowledge-tracing/admin/cache-stats
   */
  @Get('admin/cache-stats')
  @Roles('admin')
  @UseGuards(RolesGuard)
  getCacheStats() {
    return this.knowledgeStateTracker.getCacheStats();
  }

  /**
   * Get count of users struggling with a specific concept.
   * Restricted to admins — aggregate only, no raw userIds exposed.
   *
   * GET /knowledge-tracing/concept/:conceptId/struggling
   */
  @Get('concept/:conceptId/struggling')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getStrugglingUsers(@Param('conceptId') conceptId: string) {
    this.logger.debug(`Get struggling users for concept=${conceptId}`);

    const userIds =
      await this.knowledgeStateTracker.getStrugglingUsers(conceptId);

    return {
      conceptId,
      strugglingCount: userIds.length,
    };
  }

  /**
   * Get count of users who have mastered a specific concept.
   * Restricted to admins — aggregate only, no raw userIds exposed.
   *
   * GET /knowledge-tracing/concept/:conceptId/mastered
   */
  @Get('concept/:conceptId/mastered')
  @Roles('admin')
  @UseGuards(RolesGuard)
  async getMasteredUsers(@Param('conceptId') conceptId: string) {
    this.logger.debug(`Get mastered users for concept=${conceptId}`);

    const userIds =
      await this.knowledgeStateTracker.getMasteredUsers(conceptId);

    return {
      conceptId,
      masteredCount: userIds.length,
    };
  }

  /**
   * Get all knowledge states for a user.
   *
   * GET /knowledge-tracing/user/:userId
   */
  @Get('user/:userId')
  async getUserKnowledgeStates(@Param('userId') userId: string) {
    this.logger.debug(`Get all knowledge states for user=${userId}`);

    const states =
      await this.knowledgeStateTracker.getUserKnowledgeStates(userId);

    return {
      states,
      totalConcepts: states.length,
      userId,
    };
  }

  /**
   * Get current knowledge state for a user-concept pair.
   *
   * GET /knowledge-tracing/state/:userId/:conceptId
   */
  @Get('state/:userId/:conceptId')
  async getKnowledgeState(
    @Param('userId') userId: string,
    @Param('conceptId') conceptId: string,
  ) {
    this.logger.debug(
      `Get knowledge state: user=${userId}, concept=${conceptId}`,
    );

    const state = await this.knowledgeStateTracker.getKnowledgeState(
      userId,
      conceptId,
    );

    return state ?? { message: 'Knowledge state not found' };
  }

  /**
   * Reset knowledge state for a user-concept pair.
   *
   * DELETE /knowledge-tracing/state/:userId/:conceptId/reset
   */
  @Delete('state/:userId/:conceptId/reset')
  async resetKnowledgeState(
    @Param('userId') userId: string,
    @Param('conceptId') conceptId: string,
  ) {
    this.logger.log(
      `Reset knowledge state: user=${userId}, concept=${conceptId}`,
    );

    await this.knowledgeStateTracker.resetKnowledgeState(userId, conceptId);

    return {
      conceptId,
      message: 'Knowledge state reset successfully',
      userId,
    };
  }

  // ─── Concept CRUD Endpoints ─────────────────────────────────────

  /**
   * Create a new concept.
   *
   * POST /knowledge-tracing/concepts
   */
  @Post('concepts')
  async createConcept(@Body() dto: CreateConceptDto) {
    this.logger.log(`Create concept: ${dto.conceptId}`);

    const concept = await this.conceptModel.create({
      ...dto,
      autoDiscovered: false,
      isActive: true,
      verified: true,
    });

    return concept;
  }

  /**
   * List concepts with optional filtering.
   *
   * GET /knowledge-tracing/concepts
   */
  @Get('concepts')
  async listConcepts(@Query() query: ListConceptsQueryDto) {
    const filter: Record<string, unknown> = { isActive: true };

    if (query.domain) {
      filter.domain = query.domain;
    }
    if (query.difficulty) {
      filter.difficulty = query.difficulty;
    }
    if (query.autoDiscovered !== undefined) {
      filter.autoDiscovered = query.autoDiscovered;
    }
    if (query.verified !== undefined) {
      filter.verified = query.verified;
    }

    const concepts = await this.conceptModel
      .find(filter)
      .sort({ conceptId: 1 })
      .lean();

    return {
      concepts,
      total: concepts.length,
    };
  }

  /**
   * Get a single concept by conceptId.
   *
   * GET /knowledge-tracing/concepts/:conceptId
   */
  @Get('concepts/:conceptId')
  async getConcept(@Param('conceptId') conceptId: string) {
    const concept = await this.conceptModel
      .findOne({ conceptId, isActive: true })
      .lean();

    if (!concept) {
      throw new NotFoundException(`Concept '${conceptId}' not found`);
    }

    return concept;
  }

  /**
   * Update a concept.
   *
   * PATCH /knowledge-tracing/concepts/:conceptId
   */
  @Patch('concepts/:conceptId')
  async updateConcept(
    @Param('conceptId') conceptId: string,
    @Body() dto: UpdateConceptDto,
  ) {
    this.logger.log(`Update concept: ${conceptId}`);

    const concept = await this.conceptModel.findOneAndUpdate(
      { conceptId, isActive: true },
      { $set: dto },
      { new: true },
    );

    if (!concept) {
      throw new NotFoundException(`Concept '${conceptId}' not found`);
    }

    return concept;
  }

  /**
   * Soft-delete a concept (set isActive=false).
   *
   * DELETE /knowledge-tracing/concepts/:conceptId
   */
  @Delete('concepts/:conceptId')
  async deleteConcept(@Param('conceptId') conceptId: string) {
    this.logger.log(`Delete concept: ${conceptId}`);

    const concept = await this.conceptModel.findOneAndUpdate(
      { conceptId, isActive: true },
      { $set: { isActive: false } },
      { new: true },
    );

    if (!concept) {
      throw new NotFoundException(`Concept '${conceptId}' not found`);
    }

    return { conceptId, message: 'Concept deactivated successfully' };
  }
}
