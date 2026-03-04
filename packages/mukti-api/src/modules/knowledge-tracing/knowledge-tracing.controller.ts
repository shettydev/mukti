import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
} from '@nestjs/common';

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
export class KnowledgeTracingController {
  private readonly logger = new Logger(KnowledgeTracingController.name);

  constructor(
    private readonly knowledgeStateTracker: KnowledgeStateTrackerService,
  ) {}

  /**
   * Update knowledge state based on a user's response.
   *
   * POST /knowledge-tracing/update
   *
   * Body:
   * {
   *   "userId": "507f1f77bcf86cd799439011",
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
  async updateKnowledgeState(@Body() dto: UpdateKnowledgeStateDto) {
    this.logger.log(
      `Update request: user=${dto.userId}, concept=${dto.conceptId}, correct=${dto.correct}`,
    );

    const customParams = {
      ...(dto.pInit !== undefined && { pInit: dto.pInit }),
      ...(dto.pLearn !== undefined && { pLearn: dto.pLearn }),
      ...(dto.pSlip !== undefined && { pSlip: dto.pSlip }),
      ...(dto.pGuess !== undefined && { pGuess: dto.pGuess }),
    };

    const result = await this.knowledgeStateTracker.updateKnowledgeState(
      dto.userId,
      dto.conceptId,
      dto.correct,
      Object.keys(customParams).length > 0 ? customParams : undefined,
    );

    return result;
  }

  /**
   * Get cache statistics (for debugging/monitoring).
   *
   * GET /knowledge-tracing/admin/cache-stats
   */
  @Get('admin/cache-stats')
  getCacheStats() {
    return this.knowledgeStateTracker.getCacheStats();
  }

  /**
   * Get users struggling with a specific concept.
   *
   * GET /knowledge-tracing/concept/:conceptId/struggling
   */
  @Get('concept/:conceptId/struggling')
  async getStrugglingUsers(@Param('conceptId') conceptId: string) {
    this.logger.debug(`Get struggling users for concept=${conceptId}`);

    const userIds =
      await this.knowledgeStateTracker.getStrugglingUsers(conceptId);

    return {
      conceptId,
      strugglingCount: userIds.length,
      userIds,
    };
  }

  /**
   * Get users who have mastered a specific concept.
   *
   * GET /knowledge-tracing/concept/:conceptId/mastered
   */
  @Get('concept/:conceptId/mastered')
  async getMasteredUsers(@Param('conceptId') conceptId: string) {
    this.logger.debug(`Get mastered users for concept=${conceptId}`);

    const userIds =
      await this.knowledgeStateTracker.getMasteredUsers(conceptId);

    return {
      conceptId,
      masteredCount: userIds.length,
      userIds,
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

    return state || { message: 'Knowledge state not found' };
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
}
