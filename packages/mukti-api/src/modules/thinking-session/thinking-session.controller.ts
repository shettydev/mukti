import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';

import { CreateThinkingSessionDto, UpdateSessionProgressDto } from './dto';
import { ThinkingSessionService } from './thinking-session.service';
import { SessionStatus } from '../../common';

@Controller('thinking-sessions')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ThinkingSessionController {
  constructor(
    private readonly thinkingSessionService: ThinkingSessionService,
  ) {}

  @Post('begin')
  async beginSession(@Body() createSessionDto: CreateThinkingSessionDto) {
    const result =
      await this.thinkingSessionService.createSession(createSessionDto);

    return {
      sessionId: result.session.id,
      status: result.session.status,
      decompositionQuestions: result.initialInquiry.questions,
      explorationPaths: result.initialInquiry.explorationPaths,
      nextSteps: result.initialInquiry.nextSteps,
      resources: result.initialInquiry.resources,
      cognitiveLoad: result.initialInquiry.cognitiveLoad,
    };
  }

  @Get(':id')
  async getSession(@Param('id') sessionId: string) {
    const result = await this.thinkingSessionService.getSession(sessionId);

    return {
      session: {
        id: result.session.id,
        initialStatement: result.session.initialStatement,
        status: result.session.status,
        domain: result.session.domain,
        complexity: result.session.complexity,
        preferredTechnique: result.session.preferredTechnique,
        currentUnderstanding: result.session.currentUnderstanding,
        createdAt: result.session.createdAt,
        updatedAt: result.session.updatedAt,
      },
      progress: result.progress,
      inquiryPaths: result.inquiryPaths.map(path => ({
        id: path.id,
        technique: path.technique,
        questions: path.questions,
        explorationPaths: path.explorationPaths,
        nextSteps: path.nextSteps,
        isCompleted: path.isCompleted,
        createdAt: path.createdAt,
      })),
      reflections: result.reflections.map(reflection => ({
        id: reflection.id,
        type: reflection.type,
        content: reflection.content,
        confidence: reflection.confidence,
        impact: reflection.impact,
        tags: reflection.tags,
        createdAt: reflection.createdAt,
      })),
    };
  }

  @Patch(':id/progress')
  async updateProgress(
    @Param('id') sessionId: string,
    @Body() updateDto: UpdateSessionProgressDto,
  ) {
    const result = await this.thinkingSessionService.updateProgress(
      sessionId,
      updateDto,
    );

    return {
      session: {
        id: result.session.id,
        status: result.session.status,
        currentUnderstanding: result.session.currentUnderstanding,
        insightsGenerated: result.session.insightsGenerated,
        questionsExplored: result.session.questionsExplored,
        resourcesConsulted: result.session.resourcesConsulted,
        updatedAt: result.session.updatedAt,
      },
      followUpInquiry: {
        questions: result.followUpInquiry.questions,
        technique: result.followUpInquiry.technique,
        explorationPaths: result.followUpInquiry.explorationPaths,
        nextSteps: result.followUpInquiry.nextSteps,
        cognitiveLoad: result.followUpInquiry.cognitiveLoad,
      },
      insights: result.insights,
    };
  }

  @Post(':id/reflect')
  async addReflection(
    @Param('id') sessionId: string,
    @Body()
    reflectionData: {
      type:
        | 'insight'
        | 'decision'
        | 'assumption_challenge'
        | 'pattern_recognition';
      content: string;
      confidence: number;
      impact: 'low' | 'medium' | 'high';
      tags?: string[];
    },
  ) {
    const reflection = await this.thinkingSessionService.addReflection(
      sessionId,
      reflectionData,
    );

    return {
      reflection: {
        id: reflection.id,
        type: reflection.type,
        content: reflection.content,
        confidence: reflection.confidence,
        impact: reflection.impact,
        tags: reflection.tags,
        createdAt: reflection.createdAt,
      },
      message: 'Reflection captured successfully',
    };
  }

  @Get()
  async listSessions(@Query('status') status?: SessionStatus) {
    const sessions = await this.thinkingSessionService.listSessions(status);

    return {
      sessions: sessions.map(session => ({
        id: session.id,
        initialStatement: session.initialStatement,
        status: session.status,
        domain: session.domain,
        complexity: session.complexity,
        summary: session.summary,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
      total: sessions.length,
    };
  }

  @Post(':id/complete')
  async completeSession(@Param('id') sessionId: string) {
    const session =
      await this.thinkingSessionService.completeSession(sessionId);

    return {
      session: {
        id: session.id,
        status: session.status,
        completedAt: session.updatedAt,
      },
      message: 'Thinking session completed successfully',
    };
  }
}
