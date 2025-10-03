import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { CreateProblemCanvasDto, UpdateAssumptionsDto } from './dto';
import { db, problemCanvases, thinkingSessions } from '../../db';
import { OpenRouterService } from '../shared/openrouter.service';

@Injectable()
export class ProblemCanvasService {
  constructor(private readonly openRouterService: OpenRouterService) {}

  async createProblemCanvas(createDto: CreateProblemCanvasDto) {
    // Verify session exists
    const session = await db
      .select()
      .from(thinkingSessions)
      .where(eq(thinkingSessions.id, createDto.sessionId))
      .limit(1);

    if (!session.length) {
      throw new NotFoundException('Thinking session not found');
    }

    try {
      // Generate initial problem decomposition using AI
      const decomposition = await this.generateProblemDecomposition(
        createDto.initialStatement,
        createDto.context.domain,
        createDto.context.urgency,
      );

      const canvas = await db
        .insert(problemCanvases)
        .values({
          sessionId: createDto.sessionId,
          initialStatement: createDto.initialStatement,
          domain: createDto.context.domain,
          urgency: createDto.context.urgency,
          priorAttempts: createDto.context.priorAttempts,
          coreIssue: decomposition.coreIssue,
          subProblems: decomposition.subProblems,
          constraints: decomposition.constraints,
          assumptions: decomposition.assumptions,
          stakeholders: decomposition.stakeholders,
          successCriteria: decomposition.successCriteria,
          assumptionMappings: decomposition.assumptionMappings,
        })
        .returning();

      return {
        canvas: canvas[0],
        decompositionQuestions: decomposition.decompositionQuestions,
        assumptionPrompts: decomposition.assumptionPrompts,
      };
    } catch (_error) {
      throw new BadRequestException('Failed to create problem canvas');
    }
  }

  async getProblemCanvas(canvasId: string) {
    const canvas = await db
      .select()
      .from(problemCanvases)
      .where(eq(problemCanvases.id, canvasId))
      .limit(1);

    if (!canvas.length) {
      throw new NotFoundException('Problem canvas not found');
    }

    return canvas[0];
  }

  async getExplorationSuggestions(canvasId: string) {
    const canvas = await this.getProblemCanvas(canvasId);

    try {
      const suggestions = await this.generateExplorationSuggestions(
        canvas.coreIssue ?? canvas.initialStatement,
        canvas.domain,
        canvas.subProblems ?? [],
        canvas.constraints ?? [],
      );

      return {
        canvasId,
        explorationSuggestions: suggestions,
        metadata: {
          domain: canvas.domain,
          urgency: canvas.urgency,
          lastUpdated: canvas.updatedAt,
        },
      };
    } catch (_error) {
      // Fallback suggestions if AI service fails
      return this.getFallbackExplorationSuggestions(canvas);
    }
  }

  async updateAssumptions(canvasId: string, updateDto: UpdateAssumptionsDto) {
    const canvas = await this.getProblemCanvas(canvasId);

    // Combine existing assumptions with new ones if provided
    const updatedAssumptions = updateDto.newAssumptions
      ? [...(canvas.assumptions ?? []), ...updateDto.newAssumptions]
      : canvas.assumptions;

    const updatedCanvas = await db
      .update(problemCanvases)
      .set({
        assumptions: updatedAssumptions,
        assumptionMappings: updateDto.assumptionMappings,
        updatedAt: new Date(),
      })
      .where(eq(problemCanvases.id, canvasId))
      .returning();

    // Generate validation suggestions for updated assumptions
    const validationSuggestions = await this.generateValidationSuggestions(
      updateDto.assumptionMappings,
      canvas.domain,
    );

    return {
      canvas: updatedCanvas[0],
      validationSuggestions,
      riskAssessment: this.assessAssumptionRisks(updateDto.assumptionMappings),
    };
  }

  async validateAssumption(
    canvasId: string,
    assumptionId: string,
    validationData: {
      method: string;
      results: string;
      confidence: number;
      newEvidence: string[];
    },
  ) {
    const canvas = await this.getProblemCanvas(canvasId);

    if (!canvas.assumptionMappings) {
      throw new BadRequestException('No assumptions found to validate');
    }

    // Find and update the specific assumption
    const updatedMappings = canvas.assumptionMappings.map((mapping, index) => {
      if (index.toString() === assumptionId) {
        return {
          ...mapping,
          validationMethod: validationData.method,
          confidence: validationData.confidence,
          tested: true,
        };
      }
      return mapping;
    });

    const updatedCanvas = await db
      .update(problemCanvases)
      .set({
        assumptionMappings: updatedMappings,
        updatedAt: new Date(),
      })
      .where(eq(problemCanvases.id, canvasId))
      .returning();

    return {
      canvas: updatedCanvas[0],
      validationResults: {
        method: validationData.method,
        results: validationData.results,
        confidence: validationData.confidence,
        evidence: validationData.newEvidence,
      },
      nextSteps: this.generateNextValidationSteps(updatedMappings),
    };
  }

  private async generateProblemDecomposition(
    initialStatement: string,
    domain: string,
    urgency: string,
  ) {
    const prompt = `
Problem Statement: ${initialStatement}
Domain: ${domain}
Urgency Level: ${urgency}

Analyze this problem and decompose it into its core components. Provide a structured breakdown that will guide deeper exploration.

Respond with JSON containing:
- coreIssue: the fundamental problem at the heart of this
- subProblems: array of 3-5 component problems
- constraints: array of limitations or restrictions
- assumptions: array of 4-6 underlying assumptions
- stakeholders: array of people/groups affected
- successCriteria: array of measures for success
- assumptionMappings: array of objects with {assumption, confidence: 1-10, impact: low/medium/high, tested: false}
- decompositionQuestions: array of 3-4 questions to explore each component
- assumptionPrompts: array of prompts to help identify more assumptions
`;

    try {
      const response = await this.openRouterService.generateCompletion([
        {
          role: 'system',
          content:
            'You are an expert problem analyst. Always respond with valid JSON format.',
        },
        { role: 'user', content: prompt },
      ]);

      return JSON.parse(response);
    } catch (_error) {
      return this.getFallbackDecomposition(initialStatement, domain);
    }
  }

  private async generateExplorationSuggestions(
    coreIssue: string,
    domain: string,
    subProblems: string[],
    constraints: string[],
  ) {
    const prompt = `
Core Issue: ${coreIssue}
Domain: ${domain}
Sub-problems: ${subProblems.join(', ')}
Constraints: ${constraints.join(', ')}

Generate exploration suggestions that will deepen understanding of this problem. Focus on different angles of investigation.

Respond with JSON containing an array of exploration objects, each with:
- path: name of exploration direction
- questions: array of 2-3 specific questions
- expectedInsights: array of potential discoveries
- difficulty: easy/moderate/challenging
- estimatedTime: time estimate string
`;

    const response = await this.openRouterService.generateCompletion([
      {
        role: 'system',
        content:
          'You are an expert in problem exploration techniques. Always respond with valid JSON format.',
      },
      { role: 'user', content: prompt },
    ]);

    return JSON.parse(response);
  }

  private async generateValidationSuggestions(
    assumptionMappings: any[],
    domain: string,
  ) {
    const highRiskAssumptions = assumptionMappings
      .filter(mapping => mapping.impact === 'high' && !mapping.tested)
      .slice(0, 3);

    if (highRiskAssumptions.length === 0) {
      return [];
    }

    const prompt = `
Domain: ${domain}
High-Risk Assumptions: ${highRiskAssumptions.map(a => a.assumption).join('; ')}

Suggest specific methods to validate these assumptions. Focus on practical, actionable approaches.

Respond with JSON containing array of validation suggestions, each with:
- assumption: the assumption being validated
- methods: array of validation approaches
- timeRequired: estimated time
- resources: resources needed
- risks: potential risks of validation
`;

    try {
      const response = await this.openRouterService.generateCompletion([
        {
          role: 'system',
          content:
            'You are an expert in assumption testing and validation. Always respond with valid JSON format.',
        },
        { role: 'user', content: prompt },
      ]);

      return JSON.parse(response);
    } catch (_error) {
      return this.getFallbackValidationSuggestions(highRiskAssumptions);
    }
  }

  private assessAssumptionRisks(assumptionMappings: any[]) {
    const riskLevels = {
      high: assumptionMappings.filter(
        a => a.impact === 'high' && a.confidence < 7,
      ).length,
      medium: assumptionMappings.filter(
        a => a.impact === 'medium' && a.confidence < 6,
      ).length,
      low: assumptionMappings.filter(
        a => a.impact === 'low' && a.confidence < 5,
      ).length,
    };

    const totalRisk =
      riskLevels.high * 3 + riskLevels.medium * 2 + riskLevels.low * 1;
    const maxPossibleRisk = assumptionMappings.length * 3;
    const riskScore =
      maxPossibleRisk > 0 ? (totalRisk / maxPossibleRisk) * 100 : 0;

    return {
      riskScore: Math.round(riskScore),
      riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      breakdown: riskLevels,
      recommendations: this.getRiskRecommendations(riskScore, riskLevels),
    };
  }

  private getRiskRecommendations(riskScore: number, riskLevels: any): string[] {
    const recommendations: string[] = [];

    if (riskScore > 70) {
      recommendations.push(
        'Immediate validation of high-impact assumptions required',
      );
      recommendations.push(
        'Consider postponing major decisions until key assumptions are tested',
      );
    }

    if (riskLevels.high > 2) {
      recommendations.push('Prioritize testing the most critical assumptions');
    }

    if (riskLevels.medium > 3) {
      recommendations.push(
        'Develop contingency plans for medium-impact assumptions',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Assumption risk is manageable - proceed with regular validation',
      );
    }

    return recommendations;
  }

  private generateNextValidationSteps(assumptionMappings: any[]): string[] {
    const unvalidated = assumptionMappings.filter(a => !a.tested);
    const highRiskUnvalidated = unvalidated.filter(a => a.impact === 'high');

    const steps: string[] = [];

    if (highRiskUnvalidated.length > 0) {
      steps.push(
        `Validate ${highRiskUnvalidated.length} high-impact assumptions`,
      );
    }

    if (unvalidated.length > highRiskUnvalidated.length) {
      steps.push(
        `Plan validation for ${unvalidated.length - highRiskUnvalidated.length} remaining assumptions`,
      );
    }

    steps.push('Review and update confidence levels based on new evidence');
    steps.push('Document lessons learned from validation process');

    return steps;
  }

  private getFallbackDecomposition(initialStatement: string, domain: string) {
    return {
      coreIssue: `Core challenge in ${domain}: ${initialStatement}`,
      subProblems: [
        'Understanding the root cause',
        'Identifying stakeholder needs',
        'Resource and constraint analysis',
        'Implementation challenges',
      ],
      constraints: [
        'Time limitations',
        'Resource availability',
        'Technical feasibility',
      ],
      assumptions: [
        'Current approach is suboptimal',
        'Stakeholders want this solved',
        'Solution is technically feasible',
        'Resources are available for implementation',
      ],
      stakeholders: [
        'End users',
        'Development team',
        'Management',
        'External partners',
      ],
      successCriteria: [
        'Problem is resolved',
        'Stakeholders are satisfied',
        'Solution is sustainable',
      ],
      assumptionMappings: [
        {
          assumption: 'Current approach is suboptimal',
          confidence: 7,
          impact: 'high',
          tested: false,
        },
        {
          assumption: 'Solution is technically feasible',
          confidence: 5,
          impact: 'high',
          tested: false,
        },
        {
          assumption: 'Resources are available',
          confidence: 6,
          impact: 'medium',
          tested: false,
        },
      ],
      decompositionQuestions: [
        'What is the underlying cause of this problem?',
        'Who are all the stakeholders affected?',
        'What constraints limit our solution options?',
        'How will we measure success?',
      ],
      assumptionPrompts: [
        'I assume that...',
        'We believe stakeholders want...',
        'The technical approach assumes...',
        'Our timeline assumes...',
      ],
    };
  }

  private getFallbackExplorationSuggestions(canvas: any) {
    return {
      canvasId: canvas.id,
      explorationSuggestions: [
        {
          path: 'Root Cause Analysis',
          questions: [
            'What are the underlying causes?',
            'How do these causes interact?',
          ],
          expectedInsights: [
            'Primary drivers identified',
            'System interactions understood',
          ],
          difficulty: 'moderate',
          estimatedTime: '1-2 hours',
        },
        {
          path: 'Stakeholder Perspective',
          questions: [
            'How does each stakeholder view this problem?',
            'What are their priorities?',
          ],
          expectedInsights: [
            'Multiple viewpoints captured',
            'Conflicting needs identified',
          ],
          difficulty: 'easy',
          estimatedTime: '30-60 minutes',
        },
        {
          path: 'Constraint Analysis',
          questions: [
            'Which constraints are absolute?',
            'Where is there flexibility?',
          ],
          expectedInsights: [
            'Real vs. perceived constraints',
            'Areas for negotiation',
          ],
          difficulty: 'moderate',
          estimatedTime: '45-90 minutes',
        },
      ],
      metadata: {
        domain: canvas.domain,
        urgency: canvas.urgency,
        lastUpdated: canvas.updatedAt,
      },
    };
  }

  private getFallbackValidationSuggestions(assumptions: any[]) {
    return assumptions.map(assumption => ({
      assumption: assumption.assumption,
      methods: [
        'Survey stakeholders',
        'Run small test',
        'Research similar cases',
      ],
      timeRequired: '1-2 weeks',
      resources: ['Survey tool', 'Test environment', 'Research time'],
      risks: ['May reveal uncomfortable truths', 'Could delay timeline'],
    }));
  }
}
