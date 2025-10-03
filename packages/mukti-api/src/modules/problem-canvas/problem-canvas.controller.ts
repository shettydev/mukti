import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';

import type {
  AssumptionMapping,
  ValidationData,
  RiskMetrics,
} from './interfaces/assumption.interface';

import { CreateProblemCanvasDto, UpdateAssumptionsDto } from './dto';
import { ProblemCanvasService } from './problem-canvas.service';

@Controller('problem-canvas')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProblemCanvasController {
  constructor(private readonly problemCanvasService: ProblemCanvasService) {}

  @Post('define')
  async defineProblem(@Body() createDto: CreateProblemCanvasDto) {
    const result =
      await this.problemCanvasService.createProblemCanvas(createDto);

    return {
      canvasId: result.canvas.id,
      problemDefinition: {
        initialStatement: result.canvas.initialStatement,
        coreIssue: result.canvas.coreIssue,
        subProblems: result.canvas.subProblems,
        constraints: result.canvas.constraints,
        assumptions: result.canvas.assumptions,
        stakeholders: result.canvas.stakeholders,
        successCriteria: result.canvas.successCriteria,
      },
      decompositionQuestions: result.decompositionQuestions,
      assumptionPrompts: result.assumptionPrompts,
      assumptionMappings: result.canvas.assumptionMappings,
      metadata: {
        domain: result.canvas.domain,
        urgency: result.canvas.urgency,
        sessionId: result.canvas.sessionId,
        createdAt: result.canvas.createdAt,
      },
    };
  }

  @Get(':id')
  async getProblemCanvas(@Param('id') canvasId: string) {
    const canvas = await this.problemCanvasService.getProblemCanvas(canvasId);

    return {
      canvas: {
        id: canvas.id,
        sessionId: canvas.sessionId,
        initialStatement: canvas.initialStatement,
        coreIssue: canvas.coreIssue,
        subProblems: canvas.subProblems,
        constraints: canvas.constraints,
        assumptions: canvas.assumptions,
        stakeholders: canvas.stakeholders,
        successCriteria: canvas.successCriteria,
        assumptionMappings: canvas.assumptionMappings,
        domain: canvas.domain,
        urgency: canvas.urgency,
        createdAt: canvas.createdAt,
        updatedAt: canvas.updatedAt,
      },
    };
  }

  @Get(':id/explore')
  async getExplorationSuggestions(@Param('id') canvasId: string) {
    const result =
      await this.problemCanvasService.getExplorationSuggestions(canvasId);

    return {
      canvasId: result.canvasId,
      explorationSuggestions: result.explorationSuggestions.map(suggestion => ({
        path: suggestion.path,
        questions: suggestion.questions,
        expectedInsights: suggestion.expectedInsights,
        difficulty: suggestion.difficulty,
        estimatedTime: suggestion.estimatedTime,
      })),
      guidance: {
        recommendedOrder:
          'Start with easier explorations to build understanding',
        timeManagement: 'Allocate time based on your learning objectives',
        depthVsBreadth:
          'Choose between thorough exploration of one path vs. survey of multiple paths',
      },
      metadata: result.metadata,
    };
  }

  @Patch(':id/assumptions')
  async updateAssumptions(
    @Param('id') canvasId: string,
    @Body() updateDto: UpdateAssumptionsDto,
  ) {
    const result = await this.problemCanvasService.updateAssumptions(
      canvasId,
      updateDto,
    );

    return {
      canvas: {
        id: result.canvas.id,
        assumptions: result.canvas.assumptions,
        assumptionMappings: result.canvas.assumptionMappings,
        updatedAt: result.canvas.updatedAt,
      },
      validationSuggestions: result.validationSuggestions,
      riskAssessment: {
        riskScore: result.riskAssessment.riskScore,
        riskLevel: result.riskAssessment.riskLevel,
        breakdown: result.riskAssessment.breakdown,
        recommendations: result.riskAssessment.recommendations,
      },
      nextSteps: [
        'Review high-risk assumptions first',
        'Plan validation activities',
        'Set confidence thresholds for decisions',
        'Document assumption changes over time',
      ],
    };
  }

  @Post(':id/assumptions/:assumptionId/validate')
  async validateAssumption(
    @Param('id') canvasId: string,
    @Param('assumptionId') assumptionId: string,
    @Body()
    validationData: {
      method: string;
      results: string;
      confidence: number;
      newEvidence: string[];
    },
  ) {
    const result = await this.problemCanvasService.validateAssumption(
      canvasId,
      assumptionId,
      validationData,
    );

    return {
      canvas: {
        id: result.canvas.id,
        assumptionMappings: result.canvas.assumptionMappings,
        updatedAt: result.canvas.updatedAt,
      },
      validationResults: result.validationResults,
      impact: this.assessValidationImpact(validationData),
      nextSteps: result.nextSteps,
      learningPoints: [
        'How did this validation change your understanding?',
        'What new questions does this raise?',
        'How does this affect your approach to the problem?',
      ],
    };
  }

  @Get(':id/assumptions/risk-analysis')
  async getAssumptionRiskAnalysis(@Param('id') canvasId: string) {
    const canvas = await this.problemCanvasService.getProblemCanvas(canvasId);

    if (!canvas.assumptionMappings) {
      return {
        message: 'No assumptions found for risk analysis',
        suggestions: ['Add assumptions to enable risk analysis'],
      };
    }

    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(canvas.assumptionMappings);
    const prioritizedAssumptions = this.prioritizeAssumptions(
      canvas.assumptionMappings,
    );

    return {
      canvasId,
      riskMetrics,
      prioritizedAssumptions: prioritizedAssumptions.map(
        (assumption, index) => ({
          rank: index + 1,
          assumption: assumption.assumption,
          riskScore: assumption.riskScore,
          confidence: assumption.confidence,
          impact: assumption.impact,
          tested: assumption.tested,
          recommendation: this.getAssumptionRecommendation(assumption),
        }),
      ),
      overallAssessment: {
        totalAssumptions: canvas.assumptionMappings.length,
        testedAssumptions: canvas.assumptionMappings.filter(a => a.tested)
          .length,
        highRiskAssumptions: canvas.assumptionMappings.filter(
          a => this.calculateAssumptionRisk(a) > 70,
        ).length,
        recommendedActions: this.getRecommendedActions(riskMetrics),
      },
    };
  }

  private assessValidationImpact(validationData: ValidationData) {
    const impactLevel =
      validationData.confidence > 8
        ? 'high'
        : validationData.confidence > 5
          ? 'medium'
          : 'low';

    return {
      confidenceChange: `Confidence updated to ${validationData.confidence}/10`,
      impactLevel,
      evidenceStrength:
        validationData.newEvidence.length > 2
          ? 'strong'
          : validationData.newEvidence.length > 0
            ? 'moderate'
            : 'weak',
      recommendations: this.getPostValidationRecommendations(impactLevel),
    };
  }

  private getPostValidationRecommendations(impactLevel: string): string[] {
    const recommendations: Record<string, string[]> = {
      high: [
        'Update problem definition if needed',
        'Communicate findings to stakeholders',
        'Adjust project approach based on new understanding',
      ],
      medium: [
        'Document lessons learned',
        'Consider implications for related assumptions',
        'Plan follow-up validation if needed',
      ],
      low: [
        'Note findings for future reference',
        'Continue with planned approach',
        'Monitor for additional evidence',
      ],
    };

    return recommendations[impactLevel] || recommendations.medium;
  }

  private calculateRiskMetrics(
    assumptionMappings: AssumptionMapping[],
  ): RiskMetrics {
    const totalAssumptions = assumptionMappings.length;
    const testedCount = assumptionMappings.filter(a => a.tested).length;
    const highRiskCount = assumptionMappings.filter(
      a => this.calculateAssumptionRisk(a) > 70,
    ).length;
    const averageConfidence =
      assumptionMappings.reduce((sum, a) => sum + a.confidence, 0) /
      totalAssumptions;

    return {
      totalAssumptions,
      testedPercentage: Math.round((testedCount / totalAssumptions) * 100),
      highRiskPercentage: Math.round((highRiskCount / totalAssumptions) * 100),
      averageConfidence: Math.round(averageConfidence * 10) / 10,
      riskTrend: this.calculateRiskTrend(assumptionMappings),
    };
  }

  private calculateAssumptionRisk(assumption: AssumptionMapping): number {
    const impactWeight = { low: 1, medium: 2, high: 3 }[assumption.impact];
    const confidenceInverse = 11 - assumption.confidence; // Higher confidence = lower risk
    const testingPenalty = assumption.tested ? 0 : 2;

    return Math.min(
      100,
      (impactWeight * confidenceInverse + testingPenalty) * 10,
    );
  }

  private prioritizeAssumptions(assumptionMappings: AssumptionMapping[]) {
    return assumptionMappings
      .map(assumption => ({
        ...assumption,
        riskScore: this.calculateAssumptionRisk(assumption),
      }))
      .sort((a, b) => b.riskScore - a.riskScore);
  }

  private calculateRiskTrend(
    assumptionMappings: AssumptionMapping[],
  ): 'improving' | 'stable' | 'concerning' {
    const highRiskCount = assumptionMappings.filter(
      a => this.calculateAssumptionRisk(a) > 70,
    ).length;
    const totalCount = assumptionMappings.length;
    const highRiskRatio = highRiskCount / totalCount;

    if (highRiskRatio < 0.2) return 'improving';
    if (highRiskRatio < 0.5) return 'stable';
    return 'concerning';
  }

  private getAssumptionRecommendation(
    assumption: AssumptionMapping & { riskScore: number },
  ): string {
    const riskScore = assumption.riskScore;

    if (riskScore > 80)
      return 'Urgent validation required - high impact, low confidence';
    if (riskScore > 60)
      return 'Schedule validation soon - moderate to high risk';
    if (riskScore > 40)
      return 'Plan validation when convenient - manageable risk';
    return 'Monitor periodically - low risk';
  }

  private getRecommendedActions(riskMetrics: RiskMetrics): string[] {
    const actions: string[] = [];

    if (riskMetrics.testedPercentage < 30) {
      actions.push('Prioritize assumption validation - less than 30% tested');
    }

    if (riskMetrics.highRiskPercentage > 40) {
      actions.push('Address high-risk assumptions immediately');
    }

    if (riskMetrics.averageConfidence < 6) {
      actions.push('Gather more evidence to increase confidence levels');
    }

    if (riskMetrics.riskTrend === 'concerning') {
      actions.push(
        'Review problem definition - many high-risk assumptions suggest complexity',
      );
    }

    if (actions.length === 0) {
      actions.push(
        'Continue current approach - assumption risks are manageable',
      );
    }

    return actions;
  }
}
