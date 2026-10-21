import type { Job } from 'bullmq';

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  MessageEvent,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../schemas/user.schema';
import {
  type AiRequestContext,
  AiRequestGate,
} from '../ai/services/ai-request-gate.service';
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
import {
  type ExtractionStreamEvent,
  type MapExtractionJobData,
  type MapExtractionJobResult,
  MapExtractionService,
} from './services/map-extraction.service';
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
  private readonly logger = new Logger(ThoughtMapController.name);

  constructor(
    private readonly aiRequestGate: AiRequestGate,
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
    return result;
  }

  /**
   * Lists all Thought Maps for the authenticated user.
   */
  @ApiListThoughtMaps()
  @Get()
  async listMaps(@CurrentUser() user: User) {
    const maps = await this.thoughtMapService.listMaps(user._id);
    return maps;
  }

  /**
   * Retrieves a specific Thought Map with all its nodes.
   */
  @ApiGetThoughtMap()
  @Get(':id')
  async getMap(@Param('id') id: string, @CurrentUser() user: User) {
    const result = await this.thoughtMapService.getMap(id, user._id);
    return result;
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
    return node;
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
    return node;
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
  }

  /**
   * Deletes a ThoughtMap and all associated data (nodes, share links).
   */
  @ApiDeleteThoughtMap()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMap(@Param('id') id: string, @CurrentUser() user: User) {
    await this.thoughtMapService.deleteMap(id, user._id);
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

    return { jobId: result.jobId, position: result.position };
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

    return status;
  }

  /**
   * SSE stream that delivers branch suggestions for a Thought Map node.
   * Polls the BullMQ job by jobId so delivery works across API and worker processes.
   */
  @ApiStreamBranchSuggestions()
  @SkipEnvelope()
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

    return { jobId: result.jobId, position: result.position };
  }

  /**
   * SSE stream that delivers extraction events for a map extraction job.
   * Events: processing → preview (full draft map + nodes) → complete | error.
   */
  @ApiStreamExtraction()
  @SkipEnvelope()
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

    const replay = await this.finishedExtractionEvents(job, jobId, user);
    if (replay) {
      return new Observable<MessageEvent>((observer) => {
        for (const event of replay) {
          observer.next({ data: event, type: 'message' } as MessageEvent);
        }
        observer.complete();
      });
    }

    return new Observable<MessageEvent>((observer) => {
      const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const seen = new Set<ExtractionStreamEvent['type']>();
      // Set by a live `complete` or by a replay, which is the final state.
      let ended = false;
      const deliver = (event: ExtractionStreamEvent) => {
        seen.add(event.type);
        observer.next({ data: event, type: 'message' } as MessageEvent);
      };

      const connection = this.mapExtractionService.addConnection(
        jobId,
        connectionId,
        (event) => {
          if (ended) {
            return;
          }
          deliver(event);
          ended = event.type === 'complete';
        },
      );

      // The job was queued before this stream opened. If it finished while
      // this instance was subscribing, its live events are gone, so replay
      // the stored result once the subscription is in place, skipping
      // anything the live stream already delivered.
      void connection.ready
        .then(() =>
          ended ? null : this.mapExtractionService.getExtractionJob(jobId),
        )
        .then((fresh) =>
          fresh ? this.finishedExtractionEvents(fresh, jobId, user) : null,
        )
        .then((events) => {
          if (!events || ended) {
            return;
          }
          ended = true;
          for (const event of events) {
            if (!seen.has(event.type)) {
              deliver(event);
            }
          }
        })
        .catch((error: unknown) =>
          this.logger.warn(
            `Could not re-check extraction job ${jobId} after subscribing: ${String(error)}`,
          ),
        );

      return () => {
        connection.close();
      };
    });
  }

  /**
   * Events that replay a finished extraction job (`preview` then `complete`,
   * or one `error`), or `null` while it is still queued or running.
   */
  private async finishedExtractionEvents(
    job: Job<MapExtractionJobData, MapExtractionJobResult>,
    jobId: string,
    user: User,
  ): Promise<ExtractionStreamEvent[] | null> {
    const error = (message: string): ExtractionStreamEvent => ({
      data: { code: 'EXTRACTION_ERROR', message, retriable: false },
      type: 'error',
    });

    const state = await job.getState();
    if (state !== 'completed' && state !== 'failed') {
      return null;
    }

    // `getState()` asks Redis live, but `returnvalue` and `failedReason` are
    // whatever was loaded with `job`. If the job finished after that load,
    // the snapshot is stale (no result yet), so reload it once.
    const settled =
      (state === 'completed' && !job.returnvalue) ||
      (state === 'failed' && !job.failedReason)
        ? ((await this.mapExtractionService.getExtractionJob(jobId)) ?? job)
        : job;

    if (state === 'failed') {
      return [error(settled.failedReason || 'Extraction job failed')];
    }

    const result = settled.returnvalue;
    if (!result?.mapId) {
      return [error('Extraction job result missing mapId')];
    }

    try {
      const draftMap = await this.thoughtMapService.getMap(
        result.mapId,
        user._id,
      );
      return [
        { data: draftMap, type: 'preview' },
        {
          data: { jobId, mapId: result.mapId, nodeCount: result.nodeCount },
          type: 'complete',
        },
      ];
    } catch (caught: unknown) {
      return [
        error(
          caught instanceof Error ? caught.message : 'Extraction stream failed',
        ),
      ];
    }
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
    return map;
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
    return result;
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
    return map;
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
    return link;
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
    return link;
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
    return nodes;
  }

  private async resolveAiExecutionContext(
    user: User,
    requestedModel?: string,
  ): Promise<AiRequestContext> {
    return this.aiRequestGate.authorize(user._id, requestedModel);
  }
}
