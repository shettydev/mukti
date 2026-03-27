import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';

import type { Subscription } from '../../schemas/subscription.schema';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, type UserDocument } from '../../schemas/user.schema';
import { AiPolicyService } from '../ai/services/ai-policy.service';
import { AiSecretsService } from '../ai/services/ai-secrets.service';
import { ConvertCanvasDto } from './dto/convert-canvas.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { CreateThoughtMapDto } from './dto/create-thought-map.dto';
import { CreateThoughtNodeDto } from './dto/create-thought-node.dto';
import { ExtractConversationDto } from './dto/extract-conversation.dto';
import { RequestBranchSuggestionsDto } from './dto/request-branch-suggestions.dto';
import {
  ApiAddThoughtNode,
  ApiConfirmThoughtMap,
  ApiConvertFromCanvas,
  ApiCreateShareLink,
  ApiCreateThoughtMap,
  ApiDeleteShareLink,
  ApiDeleteThoughtMap,
  ApiDeleteThoughtNode,
  ApiExtractConversation,
  ApiGetSharedMap,
  ApiGetShareLink,
  ApiGetThoughtMap,
  ApiListThoughtMaps,
  ApiRequestBranchSuggestions,
  ApiStreamBranchSuggestions,
  ApiStreamExtraction,
  ApiUpdateThoughtMapSettings,
  ApiUpdateThoughtNode,
} from './dto/thought-map.swagger';
import { UpdateThoughtMapSettingsDto } from './dto/update-thought-map-settings.dto';
import { UpdateThoughtNodeDto } from './dto/update-thought-node.dto';
import { BranchSuggestionService } from './services/branch-suggestion.service';
import { MapExtractionService } from './services/map-extraction.service';
import { ThoughtMapShareService } from './services/thought-map-share.service';
import { ThoughtMapService } from './services/thought-map.service';

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
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly thoughtMapService: ThoughtMapService,
    private readonly branchSuggestionService: BranchSuggestionService,
    private readonly mapExtractionService: MapExtractionService,
    private readonly thoughtMapShareService: ThoughtMapShareService,
  ) {}

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
   * Deletes a ThoughtMap and all associated data (nodes, share links).
   */
  @ApiDeleteThoughtMap()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMap(@Param('id') id: string, @CurrentUser() user: User) {
    await this.thoughtMapService.deleteMap(id, user._id);
    return {
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Enqueues an AI branch suggestion job for a Thought Map node.
   * Returns 202 Accepted with jobId. Client subscribes to the SSE stream to receive results.
   */
  @ApiRequestBranchSuggestions()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/suggest')
  async requestSuggestions(
    @Param('id') id: string,
    @Body() dto: RequestBranchSuggestionsDto,
    @CurrentUser() user: User,
  ) {
    // Validate ownership
    await this.thoughtMapService.findMapById(id, user._id);

    const { model, subscriptionTier, usedByok } =
      await this.resolveAiExecutionContext(user, dto.model);

    const result = await this.branchSuggestionService.enqueueSuggestion(
      user._id,
      id,
      dto.parentNodeId,
      subscriptionTier,
      model,
      usedByok,
    );

    return {
      data: { jobId: result.jobId, position: result.position },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  @Get(':id/suggest/jobs/:jobId')
  async getSuggestionJobStatus(
    @Param('id') id: string,
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ) {
    await this.thoughtMapService.findMapById(id, user._id);

    const status =
      await this.branchSuggestionService.getSuggestionJobStatus(jobId);
    const result = status.result;

    if (result && result.mapId !== id) {
      throw new ForbiddenException(
        'Suggestion job does not belong to this map',
      );
    }

    const job = await this.branchSuggestionService.getSuggestionJob(jobId);
    if (job?.data.userId !== user._id.toString()) {
      throw new ForbiddenException(
        'Suggestion job does not belong to this user',
      );
    }

    return {
      data: status,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * SSE stream that delivers branch suggestions for a Thought Map node.
   * Polls the BullMQ job by jobId so delivery works across API and worker processes.
   */
  @ApiStreamBranchSuggestions()
  @Sse(':id/suggest/stream')
  async streamSuggestions(
    @Param('id') id: string,
    @Query('jobId') jobId: string,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    try {
      await this.thoughtMapService.findMapById(id, user._id);
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw error;
    }

    return new Observable<MessageEvent>((observer) => {
      if (!jobId) {
        observer.next({
          data: {
            data: {
              code: 'SUGGESTION_ERROR',
              message: 'jobId is required',
              retriable: false,
            },
            type: 'error',
          },
          type: 'message',
        } as MessageEvent);
        observer.complete();
        return undefined;
      }

      const userId = user._id.toString();
      let isClosed = false;
      let hasFinished = false;
      let isPolling = false;

      observer.next({
        data: {
          data: { jobId, status: 'started' },
          type: 'processing',
        },
        type: 'message',
      } as MessageEvent);

      const poll = async () => {
        if (isClosed || hasFinished || isPolling) {
          return;
        }

        isPolling = true;

        try {
          const job =
            await this.branchSuggestionService.getSuggestionJob(jobId);

          if (!job) {
            hasFinished = true;
            observer.next({
              data: {
                data: {
                  code: 'SUGGESTION_ERROR',
                  message: 'Suggestion job not found',
                  retriable: false,
                },
                type: 'error',
              },
              type: 'message',
            } as MessageEvent);
            observer.complete();
            return;
          }

          if (job.data.mapId !== id || job.data.userId !== userId) {
            hasFinished = true;
            observer.next({
              data: {
                data: {
                  code: 'SUGGESTION_ERROR',
                  message: 'Suggestion job does not belong to this map',
                  retriable: false,
                },
                type: 'error',
              },
              type: 'message',
            } as MessageEvent);
            observer.complete();
            return;
          }

          const state = await job.getState();

          if (
            state === 'waiting' ||
            state === 'delayed' ||
            state === 'prioritized' ||
            state === 'active'
          ) {
            return;
          }

          if (state === 'failed') {
            hasFinished = true;
            observer.next({
              data: {
                data: {
                  code: 'SUGGESTION_ERROR',
                  message: job.failedReason || 'Suggestion job failed',
                  retriable: true,
                },
                type: 'error',
              },
              type: 'message',
            } as MessageEvent);
            observer.complete();
            return;
          }

          if (state === 'completed') {
            const result = job.returnvalue;
            const suggestions = result?.suggestions ?? [];
            hasFinished = true;

            for (const suggestion of suggestions) {
              observer.next({
                data: {
                  data: suggestion,
                  type: 'suggestion',
                },
                type: 'message',
              } as MessageEvent);
            }

            observer.next({
              data: {
                data: {
                  jobId,
                  suggestionCount: suggestions.length,
                },
                type: 'complete',
              },
              type: 'message',
            } as MessageEvent);
            observer.complete();
          }
        } catch (error: unknown) {
          hasFinished = true;
          observer.next({
            data: {
              data: {
                code: 'SUGGESTION_ERROR',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Suggestion stream failed',
                retriable: true,
              },
              type: 'error',
            },
            type: 'message',
          } as MessageEvent);
          observer.complete();
        } finally {
          isPolling = false;
        }
      };

      void poll();
      const interval = setInterval(() => {
        void poll();
      }, 250);

      return () => {
        isClosed = true;
        clearInterval(interval);
      };
    });
  }

  /**
   * Enqueues a conversation → Thought Map extraction job.
   * Returns 202 Accepted with jobId and queue position.
   * Client subscribes to the SSE stream at /extract/:jobId/stream.
   */
  @ApiExtractConversation()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('extract')
  async extractConversation(
    @Body() dto: ExtractConversationDto,
    @CurrentUser() user: User,
  ) {
    const { model, subscriptionTier, usedByok } =
      await this.resolveAiExecutionContext(user, dto.model);

    const result = await this.mapExtractionService.enqueueExtraction(
      user._id,
      dto.conversationId,
      model,
      usedByok,
      subscriptionTier,
    );

    return {
      data: { jobId: result.jobId, position: result.position },
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * SSE stream that delivers extraction events for a map extraction job.
   * Events: processing → preview (full draft map + nodes) → complete | error.
   */
  @ApiStreamExtraction()
  @Sse('extract/:jobId/stream')
  async streamExtraction(
    @Param('jobId') jobId: string,
    @CurrentUser() user: User,
  ): Promise<Observable<MessageEvent>> {
    const job = await this.mapExtractionService.getExtractionJob(jobId);

    if (!job) {
      throw new NotFoundException('Extraction job not found');
    }

    if (job.data.userId !== user._id.toString()) {
      throw new ForbiddenException(
        'Extraction job does not belong to this user',
      );
    }

    const jobState = await job.getState();

    if (jobState === 'completed') {
      return new Observable<MessageEvent>((observer) => {
        void (async () => {
          try {
            const result = job.returnvalue;
            if (!result?.mapId) {
              observer.next({
                data: {
                  data: {
                    code: 'EXTRACTION_ERROR',
                    message: 'Extraction job result missing mapId',
                    retriable: false,
                  },
                  type: 'error',
                },
                type: 'message',
              } as MessageEvent);
              observer.complete();
              return;
            }

            const draftMap = await this.thoughtMapService.getMap(
              result.mapId,
              user._id,
            );

            observer.next({
              data: {
                data: draftMap,
                type: 'preview',
              },
              type: 'message',
            } as MessageEvent);
            observer.next({
              data: {
                data: {
                  jobId,
                  mapId: result.mapId,
                  nodeCount: result.nodeCount,
                },
                type: 'complete',
              },
              type: 'message',
            } as MessageEvent);
          } catch (error: unknown) {
            observer.next({
              data: {
                data: {
                  code: 'EXTRACTION_ERROR',
                  message:
                    error instanceof Error
                      ? error.message
                      : 'Extraction stream failed',
                  retriable: false,
                },
                type: 'error',
              },
              type: 'message',
            } as MessageEvent);
          } finally {
            observer.complete();
          }
        })();
      });
    }

    if (jobState === 'failed') {
      return new Observable<MessageEvent>((observer) => {
        observer.next({
          data: {
            data: {
              code: 'EXTRACTION_ERROR',
              message: job.failedReason || 'Extraction job failed',
              retriable: false,
            },
            type: 'error',
          },
          type: 'message',
        } as MessageEvent);
        observer.complete();
      });
    }

    return new Observable<MessageEvent>((observer) => {
      const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const cleanup = this.mapExtractionService.addConnection(
        jobId,
        connectionId,
        (event) => {
          observer.next({ data: event, type: 'message' } as MessageEvent);
        },
      );

      return () => {
        cleanup();
      };
    });
  }

  /**
   * Confirms a draft Thought Map, transitioning it to active status.
   * Only maps with status "draft" that are owned by the user can be confirmed.
   */
  @ApiConfirmThoughtMap()
  @HttpCode(HttpStatus.OK)
  @Patch(':id/confirm')
  async confirmMap(@Param('id') id: string, @CurrentUser() user: User) {
    const map = await this.thoughtMapService.confirmMap(id, user._id);
    return {
      data: map,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  // ---------------------------------------------------------------------------
  // Phase 5 Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Converts a CanvasSession into a new Thought Map.
   * Seed → root topic, roots[] + soil[] → depth-1 thought nodes.
   */
  @ApiConvertFromCanvas()
  @HttpCode(HttpStatus.CREATED)
  @Post('convert-from-canvas/:sessionId')
  async convertFromCanvas(
    @Param('sessionId') sessionId: string,
    @Body() dto: ConvertCanvasDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.thoughtMapService.convertFromCanvas(
      sessionId,
      user._id,
      dto.title,
    );
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
   * Updates the auto-suggestion settings on a Thought Map.
   */
  @ApiUpdateThoughtMapSettings()
  @HttpCode(HttpStatus.OK)
  @Patch(':id/settings')
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: UpdateThoughtMapSettingsDto,
    @CurrentUser() user: User,
  ) {
    const map = await this.thoughtMapService.updateSettings(id, user._id, dto);
    return {
      data: map,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Creates (or replaces) a public share link for a Thought Map.
   */
  @ApiCreateShareLink()
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/share')
  async createShareLink(
    @Param('id') id: string,
    @Body() dto: CreateShareLinkDto,
    @CurrentUser() user: User,
  ) {
    // Validate ownership before creating share link
    await this.thoughtMapService.findMapById(id, user._id);

    const link = await this.thoughtMapShareService.createShareLink(
      id,
      user._id,
      dto,
    );
    return {
      data: link,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Returns the active share link for a Thought Map.
   */
  @ApiGetShareLink()
  @Get(':id/share')
  async getShareLink(@Param('id') id: string, @CurrentUser() user: User) {
    // Validate ownership
    await this.thoughtMapService.findMapById(id, user._id);

    const link = await this.thoughtMapShareService.getActiveShareLink(id);
    return {
      data: link,
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Revokes (deactivates) the active share link for a Thought Map.
   */
  @ApiDeleteShareLink()
  @Delete(':id/share')
  @HttpCode(HttpStatus.OK)
  async revokeShareLink(@Param('id') id: string, @CurrentUser() user: User) {
    // Validate ownership
    await this.thoughtMapService.findMapById(id, user._id);

    await this.thoughtMapShareService.revokeShareLink(id);
    return {
      meta: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      },
      success: true,
    };
  }

  /**
   * Public endpoint — resolves a share token and returns the Thought Map + nodes.
   * Does NOT require JWT authentication.
   */
  @ApiGetSharedMap()
  @Get('share/:token')
  @Public()
  async getSharedMap(@Param('token') token: string) {
    const link = await this.thoughtMapShareService.getShareLinkByToken(token);
    const mapId = link.thoughtMapId.toString();

    const nodes = await this.thoughtMapService.getPublicMap(mapId);
    return {
      data: nodes,
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

  private async resolveAiExecutionContext(
    user: User,
    requestedModel?: string,
  ): Promise<{
    model: string;
    subscriptionTier: 'free' | 'paid';
    usedByok: boolean;
  }> {
    const userWithSubscription = user as User & { subscription?: Subscription };
    const subscriptionTier: 'free' | 'paid' =
      userWithSubscription.subscription?.tier === 'paid' ? 'paid' : 'free';

    const userRecord = await this.userModel
      .findById(user._id)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();
    if (!userRecord) {
      throw new Error('User not found');
    }

    const usedByok = !!userRecord.openRouterApiKeyEncrypted;
    const serverApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
    if (!usedByok && !serverApiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const validationApiKey = usedByok
      ? this.aiSecretsService.decryptString(
          userRecord.openRouterApiKeyEncrypted!,
        )
      : serverApiKey;

    const model = await this.aiPolicyService.resolveEffectiveModel({
      hasByok: usedByok,
      requestedModel,
      userActiveModel: userRecord.preferences?.activeModel,
      validationApiKey,
    });

    const shouldPersistModel =
      !!requestedModel || !userRecord.preferences?.activeModel;
    if (shouldPersistModel) {
      await this.userModel.updateOne(
        { _id: user._id },
        { $set: { 'preferences.activeModel': model } },
      );
    }

    return { model, subscriptionTier, usedByok };
  }
}
