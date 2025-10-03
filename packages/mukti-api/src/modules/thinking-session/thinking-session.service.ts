import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { SocraticInquiryService } from '../socratic-inquiry/socratic-inquiry.service';
import { ComplexityLevel, InquiryTechnique, SessionStatus } from '../../common';
import { db, inquiryPaths, reflectionLogs, thinkingSessions } from '../../db';
import { CreateThinkingSessionDto, UpdateSessionProgressDto } from './dto';

@Injectable()
export class ThinkingSessionService {
  constructor(
    private readonly socraticInquiryService: SocraticInquiryService,
  ) {}

  async createSession(createSessionDto: CreateThinkingSessionDto) {
    const { initialStatement, context, preferredTechnique } = createSessionDto;

    try {
      const newSession = await db
        .insert(thinkingSessions)
        .values({
          initialStatement,
          domain: context.domain,
          urgency: context.urgency,
          complexity: context.complexity,
          preferredTechnique: preferredTechnique ?? InquiryTechnique.ELENCHUS,
          priorAttempts: context.priorAttempts,
          learningGoals: context.learningGoals,
          status: SessionStatus.INITIATED,
          currentStage: 'problem_definition',
          completedStages: [],
        })
        .returning();

      const session = newSession[0];

      // Generate initial inquiry to guide the session
      const initialInquiry = await this.socraticInquiryService.generateInquiry({
        context: {
          domain: context.domain,
          complexity: context.complexity,
          constraints: [],
          priorKnowledge: [],
          learningObjectives: context.learningGoals,
        },
        currentUnderstanding: initialStatement,
        technique: preferredTechnique ?? InquiryTechnique.ELENCHUS,
      });

      // Create initial inquiry path
      await db.insert(inquiryPaths).values({
        sessionId: session.id,
        technique: preferredTechnique ?? InquiryTechnique.ELENCHUS,
        currentUnderstanding: initialStatement,
        questions: initialInquiry.questions,
        explorationPaths: initialInquiry.explorationPaths,
        nextSteps: initialInquiry.nextSteps,
        cognitiveLoad: initialInquiry.cognitiveLoad,
        userResponses: [],
        isCompleted: false,
      });

      return {
        session,
        initialInquiry,
      };
    } catch (_error) {
      throw new BadRequestException('Failed to create thinking session');
    }
  }

  async getSession(sessionId: string) {
    const session = await db
      .select()
      .from(thinkingSessions)
      .where(eq(thinkingSessions.id, sessionId))
      .limit(1);

    if (!session.length) {
      throw new NotFoundException('Thinking session not found');
    }

    // Get related inquiry paths
    const inquiryPathsData = await db
      .select()
      .from(inquiryPaths)
      .where(eq(inquiryPaths.sessionId, sessionId));

    // Get reflection logs
    const reflections = await db
      .select()
      .from(reflectionLogs)
      .where(eq(reflectionLogs.sessionId, sessionId));

    return {
      session: session[0],
      inquiryPaths: inquiryPathsData,
      reflections,
      progress: this.calculateProgress(
        session[0],
        inquiryPathsData,
        reflections,
      ),
    };
  }

  async updateProgress(sessionId: string, updateDto: UpdateSessionProgressDto) {
    const session = await db
      .select()
      .from(thinkingSessions)
      .where(eq(thinkingSessions.id, sessionId))
      .limit(1);

    if (!session.length) {
      throw new NotFoundException('Thinking session not found');
    }

    const currentSession = session[0];

    // Update session with new understanding and progress
    const updatedSession = await db
      .update(thinkingSessions)
      .set({
        currentUnderstanding: updateDto.newUnderstanding,
        currentStage: updateDto.currentStage ?? currentSession.currentStage,
        completedStages:
          updateDto.completedStages ?? currentSession.completedStages,
        insightsGenerated:
          currentSession.insightsGenerated + updateDto.discoveries.length,
        questionsExplored:
          currentSession.questionsExplored + updateDto.questionsAnswered.length,
        resourcesConsulted:
          currentSession.resourcesConsulted + updateDto.resourcesUsed.length,
        updatedAt: new Date(),
      })
      .where(eq(thinkingSessions.id, sessionId))
      .returning();

    // Generate follow-up inquiry based on progress
    const followUpInquiry = await this.socraticInquiryService.generateInquiry({
      context: {
        domain: currentSession.domain,
        complexity: currentSession.complexity as ComplexityLevel,
        constraints: [],
        priorKnowledge: updateDto.questionsAnswered,
        learningObjectives: currentSession.learningGoals ?? [],
      },
      currentUnderstanding: updateDto.newUnderstanding,
      technique: currentSession.preferredTechnique as InquiryTechnique,
      sessionId,
    });

    // Create new inquiry path for continued exploration
    await db.insert(inquiryPaths).values({
      sessionId,
      technique: currentSession.preferredTechnique as InquiryTechnique,
      currentUnderstanding: updateDto.newUnderstanding,
      questions: followUpInquiry.questions,
      explorationPaths: followUpInquiry.explorationPaths,
      nextSteps: followUpInquiry.nextSteps,
      cognitiveLoad: followUpInquiry.cognitiveLoad,
      userResponses: updateDto.questionsAnswered,
      isCompleted: false,
    });

    return {
      session: updatedSession[0],
      followUpInquiry,
      insights: updateDto.discoveries,
    };
  }

  async addReflection(
    sessionId: string,
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
    // Verify session exists
    const session = await db
      .select()
      .from(thinkingSessions)
      .where(eq(thinkingSessions.id, sessionId))
      .limit(1);

    if (!session.length) {
      throw new NotFoundException('Thinking session not found');
    }

    const reflection = await db
      .insert(reflectionLogs)
      .values({
        sessionId,
        type: reflectionData.type,
        content: reflectionData.content,
        confidence: reflectionData.confidence,
        impact: reflectionData.impact,
        tags: reflectionData.tags ?? [],
      })
      .returning();

    // Update session reflection count
    await db
      .update(thinkingSessions)
      .set({
        reflectionPoints: session[0].reflectionPoints + 1,
        updatedAt: new Date(),
      })
      .where(eq(thinkingSessions.id, sessionId));

    return reflection[0];
  }

  async listSessions(status?: SessionStatus) {
    const query = db.select().from(thinkingSessions);

    if (status) {
      query.where(eq(thinkingSessions.status, status));
    }

    const sessions = await query;

    return sessions.map(session => ({
      ...session,
      summary: {
        domain: session.domain,
        complexity: session.complexity,
        progress: `${session.insightsGenerated} insights, ${session.questionsExplored} questions explored`,
        lastActivity: session.updatedAt,
      },
    }));
  }

  async completeSession(sessionId: string) {
    const session = await db
      .select()
      .from(thinkingSessions)
      .where(eq(thinkingSessions.id, sessionId))
      .limit(1);

    if (!session.length) {
      throw new NotFoundException('Thinking session not found');
    }

    const updatedSession = await db
      .update(thinkingSessions)
      .set({
        status: SessionStatus.COMPLETED,
        updatedAt: new Date(),
      })
      .where(eq(thinkingSessions.id, sessionId))
      .returning();

    // Mark all inquiry paths as completed
    await db
      .update(inquiryPaths)
      .set({
        isCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(inquiryPaths.sessionId, sessionId));

    return updatedSession[0];
  }

  private calculateProgress(
    session: any,
    inquiryPathsData: any[],
    reflections: any[],
  ) {
    const completedPaths = inquiryPathsData.filter(
      path => path.isCompleted,
    ).length;
    const totalPaths = inquiryPathsData.length;

    return {
      overallProgress: totalPaths > 0 ? (completedPaths / totalPaths) * 100 : 0,
      insightsGenerated: session.insightsGenerated,
      questionsExplored: session.questionsExplored,
      resourcesConsulted: session.resourcesConsulted,
      reflectionPoints: reflections.length,
      currentStage: session.currentStage,
      completedStages: session.completedStages ?? [],
    };
  }
}
