import type { Response } from 'express';

import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipEnvelope } from '../../common/decorators/skip-envelope.decorator';
import { User } from '../../schemas/user.schema';
import { renderJson, renderMarkdown } from './render-export';
import { MAX_REDACTIONS, redactionTermProblem } from './sanitize-export';
import {
  type ExportTarget,
  SessionExportService,
} from './session-export.service';
import {
  type ExportFormat,
  type ExportMode,
  type ExportSurface,
  type SessionExport,
} from './session-export.types';

const FORMATS: readonly ExportFormat[] = ['json', 'md'];
const MODES: readonly ExportMode[] = ['full', 'metrics'];

/**
 * Session export downloads for the three dialogue surfaces (session-export
 * spec). Each returns a file, not the JSON envelope.
 *
 * @remarks
 * Query: `format=json|md` (default json), `mode=full|metrics` (default full),
 * and `redact`, repeatable, at most {@link MAX_REDACTIONS} strings that
 * {@link redactionTermProblem} accepts (1 to 200 characters). Another user's
 * dialogue answers not found, never forbidden, so an export cannot confirm
 * that it exists.
 */
@ApiTags('Session export')
@Controller()
export class SessionExportController {
  constructor(private readonly service: SessionExportService) {}

  @Get('canvas/:sessionId/nodes/:nodeId/dialogue/export')
  @Header('Cache-Control', 'no-store')
  @SkipEnvelope()
  exportCanvasNode(
    @Param('sessionId') sessionId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
    @Query() query: Record<string, unknown>,
  ): Promise<StreamableFile> {
    return this.export(
      { nodeId, sessionId, surface: 'canvas_node' },
      user,
      res,
      query,
    );
  }

  @Get('conversations/:id/export')
  @Header('Cache-Control', 'no-store')
  @SkipEnvelope()
  exportConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
    @Query() query: Record<string, unknown>,
  ): Promise<StreamableFile> {
    return this.export(
      { conversationId: id, surface: 'chat' },
      user,
      res,
      query,
    );
  }

  @Get('thought-maps/:mapId/nodes/:nodeId/dialogue/export')
  @Header('Cache-Control', 'no-store')
  @SkipEnvelope()
  exportThoughtMapNode(
    @Param('mapId') mapId: string,
    @Param('nodeId') nodeId: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
    @Query() query: Record<string, unknown>,
  ): Promise<StreamableFile> {
    return this.export(
      { mapId, nodeId, surface: 'thought_map_node' },
      user,
      res,
      query,
    );
  }

  private async export(
    target: ExportTarget,
    user: User,
    res: Response,
    query: Record<string, unknown>,
  ): Promise<StreamableFile> {
    const options = parseExportQuery(query);
    assertObjectIds(target);

    let model: SessionExport;
    try {
      model = await this.service.buildModel(target, user._id.toString(), {
        mode: options.mode,
        privateValues: [user.email, user.firstName, user.lastName].filter(
          Boolean,
        ),
        redact: options.redact,
      });
    } catch (error) {
      // Someone else's dialogue is indistinguishable from a missing one.
      if (error instanceof ForbiddenException) {
        throw new NotFoundException('Dialogue not found');
      }
      throw error;
    }

    const body =
      options.format === 'md' ? renderMarkdown(model) : renderJson(model);
    const filename = exportFilename(target.surface, model.exportedAt, options);

    res.setHeader(
      'Content-Type',
      options.format === 'md'
        ? 'text/markdown; charset=utf-8'
        : 'application/json; charset=utf-8',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(Buffer.from(body, 'utf8'));
  }
}

/** The validated export options from a request's query string. */
export function parseExportQuery(query: Record<string, unknown>): {
  format: ExportFormat;
  mode: ExportMode;
  redact: string[];
} {
  const allowed = new Set(['format', 'mode', 'redact']);
  const unknown = Object.keys(query).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw new BadRequestException(
      `Unknown export option(s): ${unknown.join(', ')}`,
    );
  }

  const format = single(query.format, 'format') ?? 'json';
  if (!FORMATS.includes(format as ExportFormat)) {
    throw new BadRequestException('format must be one of: json, md');
  }
  const mode = single(query.mode, 'mode') ?? 'full';
  if (!MODES.includes(mode as ExportMode)) {
    throw new BadRequestException('mode must be one of: full, metrics');
  }

  const raw = query.redact;
  const values = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  if (!values.every((value): value is string => typeof value === 'string')) {
    throw new BadRequestException('redact must contain only strings');
  }
  const redact: string[] = values;
  if (redact.length > MAX_REDACTIONS) {
    throw new BadRequestException(
      `At most ${MAX_REDACTIONS} redaction strings are allowed`,
    );
  }
  redact.forEach((term, index) => {
    const problem = redactionTermProblem(term);
    if (problem) {
      throw new BadRequestException(`redact[${index}] ${problem}`);
    }
  });

  return {
    format: format as ExportFormat,
    mode: mode as ExportMode,
    redact,
  };
}

/** Malformed ids would fail as a cast error; they are simply not found. */
function assertObjectIds(target: ExportTarget): void {
  const ids =
    target.surface === 'chat'
      ? [target.conversationId]
      : target.surface === 'canvas_node'
        ? [target.sessionId]
        : [target.mapId];
  if (!ids.every((id) => /^[0-9a-f]{24}$/i.test(id))) {
    throw new NotFoundException('Dialogue not found');
  }
}

/** A filename with no ids or user text in it. */
function exportFilename(
  surface: ExportSurface,
  exportedAt: string,
  options: { format: ExportFormat; mode: ExportMode },
): string {
  const day = exportedAt.slice(0, 10);
  const time = exportedAt.slice(11, 19).replace(/:/g, '');
  const suffix = options.mode === 'metrics' ? '-metrics' : '';
  return `mukti-${surface.replace(/_/g, '-')}-${day}-${time}${suffix}.${options.format}`;
}

function single(value: unknown, name: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value) || typeof value !== 'string') {
    throw new BadRequestException(`${name} may be given once`);
  }
  return value;
}
