import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

import {
  InquiryTechnique,
  ComplexityLevel,
  InquiryRequest,
  InquiryResponse,
  ResourceSuggestion,
} from '../../common';
import { OpenRouterService } from '../shared/openrouter.service';

@Injectable()
export class SocraticInquiryService {
  private readonly maxQuestionsPerInquiry: number;
  private readonly defaultTechnique: InquiryTechnique;

  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly configService: ConfigService,
  ) {
    this.maxQuestionsPerInquiry =
      this.configService.get<number>('MAX_QUESTIONS_PER_INQUIRY') ?? 5;
    this.defaultTechnique =
      (this.configService.get<string>(
        'DEFAULT_INQUIRY_TECHNIQUE',
      ) as InquiryTechnique) ?? InquiryTechnique.ELENCHUS;
  }

  async generateInquiry(request: InquiryRequest): Promise<InquiryResponse> {
    const {
      context,
      currentUnderstanding,
      technique = this.defaultTechnique,
    } = request;

    try {
      // Generate Socratic questions using OpenRouter
      const socraticResult =
        await this.openRouterService.generateSocraticQuestions(
          technique,
          this.formatContextForAI(context),
          currentUnderstanding,
          context.domain,
          context.complexity,
        );

      // Generate contextual resources
      const resources = this.generateResources(
        context,
        socraticResult.explorationPaths,
      );

      return {
        questions: socraticResult.questions.slice(
          0,
          this.maxQuestionsPerInquiry,
        ),
        technique,
        explorationPaths: socraticResult.explorationPaths,
        resources,
        nextSteps: socraticResult.nextSteps,
        cognitiveLoad: this.assessCognitiveLoad(
          context.complexity,
          socraticResult.questions.length,
        ),
      };
    } catch (_error) {
      // Fallback to predefined questions if AI service fails
      return this.generateFallbackInquiry(request);
    }
  }

  async applyTechnique(
    technique: InquiryTechnique,
    context: string,
    userResponse: string,
    domain: string,
  ): Promise<{
    followUpQuestions: string[];
    insights: string[];
    suggestedPaths: string[];
  }> {
    const prompt = this.buildTechniquePrompt(
      technique,
      context,
      userResponse,
      domain,
    );

    try {
      const response = await this.openRouterService.generateCompletion([
        { role: 'system', content: this.getTechniqueSystemPrompt(technique) },
        { role: 'user', content: prompt },
      ]);

      return this.parseTechniqueResponse(response);
    } catch (_error) {
      return this.generateFallbackTechniqueResponse(technique);
    }
  }

  async generateExplorationPaths(
    domain: string,
    complexity: ComplexityLevel,
    currentFocus: string,
  ): Promise<{
    paths: {
      name: string;
      description: string;
      questions: string[];
      difficulty: 'easy' | 'moderate' | 'challenging';
      estimatedTime: string;
    }[];
  }> {
    const prompt = `
Domain: ${domain}
Complexity: ${complexity}
Current Focus: ${currentFocus}

Generate 3-4 distinct exploration paths that could deepen understanding of this topic. Each path should offer a different angle of investigation.

Respond with JSON containing a "paths" array with objects having: name, description, questions (array of 2-3), difficulty, estimatedTime.
`;

    try {
      const response = await this.openRouterService.generateCompletion([
        {
          role: 'system',
          content:
            'You are an expert learning path designer. Always respond with valid JSON format.',
        },
        { role: 'user', content: prompt },
      ]);

      return JSON.parse(response);
    } catch (_error) {
      return this.generateFallbackExplorationPaths(domain, complexity);
    }
  }

  private formatContextForAI(context: any): string {
    return `
Domain: ${context.domain}
Complexity Level: ${context.complexity}
Constraints: ${context.constraints?.join(', ') ?? 'None specified'}
Prior Knowledge: ${context.priorKnowledge?.join(', ') ?? 'Not specified'}
Learning Objectives: ${context.learningObjectives?.join(', ') ?? 'General understanding'}
Time Constraints: ${context.timeConstraints ? JSON.stringify(context.timeConstraints) : 'None specified'}
`;
  }

  private generateResources(
    context: any,
    explorationPaths: string[],
  ): ResourceSuggestion[] {
    // This would ideally integrate with external APIs to find real resources
    // For now, generating contextual resource suggestions
    const baseResources: ResourceSuggestion[] = [
      {
        type: 'documentation',
        title: `${context.domain} Fundamentals`,
        whyRelevant:
          'Provides foundational understanding necessary for deeper exploration',
        cognitiveLoad: context.complexity,
        estimatedReadTime: 15,
      },
      {
        type: 'interactive_guide',
        title: `Hands-on ${context.domain} Exploration`,
        whyRelevant:
          'Practical experience reinforces theoretical understanding',
        cognitiveLoad: context.complexity,
        estimatedReadTime: 30,
      },
    ];

    // Add path-specific resources
    explorationPaths.forEach((path, index) => {
      if (index < 2) {
        baseResources.push({
          type: 'article',
          title: `Deep Dive: ${path}`,
          whyRelevant: `Directly relevant to the ${path.toLowerCase()} exploration path`,
          cognitiveLoad: context.complexity,
          estimatedReadTime: 10,
        });
      }
    });

    return baseResources;
  }

  private assessCognitiveLoad(
    complexity: ComplexityLevel,
    questionCount: number,
  ): ComplexityLevel {
    const baseLoadMap: Record<ComplexityLevel, number> = {
      [ComplexityLevel.BEGINNER]: 1,
      [ComplexityLevel.INTERMEDIATE]: 2,
      [ComplexityLevel.ADVANCED]: 3,
      [ComplexityLevel.EXPERT]: 4,
    };

    const load = baseLoadMap[complexity] + Math.floor(questionCount / 3);

    if (load <= 1) return ComplexityLevel.BEGINNER;
    if (load <= 2) return ComplexityLevel.INTERMEDIATE;
    if (load <= 3) return ComplexityLevel.ADVANCED;
    return ComplexityLevel.EXPERT;
  }

  private buildTechniquePrompt(
    technique: InquiryTechnique,
    context: string,
    userResponse: string,
    domain: string,
  ): string {
    return `
Context: ${context}
Domain: ${domain}
User's Response: ${userResponse}
Technique: ${technique}

Based on the user's response, generate follow-up questions using the ${technique} technique. Also identify any insights revealed by their response and suggest next exploration paths.

Respond with JSON containing:
- followUpQuestions: array of 2-3 questions
- insights: array of observations about their understanding
- suggestedPaths: array of next investigation directions
`;
  }

  private getTechniqueSystemPrompt(technique: InquiryTechnique): string {
    const prompts: Record<InquiryTechnique, string> = {
      [InquiryTechnique.ELENCHUS]:
        'You are a master of elenctic examination. Use cross-examination to expose assumptions and gaps in reasoning. Always respond with valid JSON.',
      [InquiryTechnique.MAIEUTICS]:
        'You are skilled in maieutic questioning. Help the learner give birth to their own insights through careful questioning. Always respond with valid JSON.',
      [InquiryTechnique.DIALECTIC]:
        'You are expert in dialectical reasoning. Guide systematic exploration through logical progression. Always respond with valid JSON.',
      [InquiryTechnique.APORIA]:
        'You are adept at creating productive confusion. Generate questions that reveal the complexity of seemingly simple concepts. Always respond with valid JSON.',
      [InquiryTechnique.IRONY]:
        'You are skilled in Socratic irony. Use feigned ignorance to encourage independent thinking. Always respond with valid JSON.',
    };

    return prompts[technique];
  }

  private parseTechniqueResponse(response: string): {
    followUpQuestions: string[];
    insights: string[];
    suggestedPaths: string[];
  } {
    try {
      return JSON.parse(response);
    } catch (_error) {
      // Fallback parsing
      return {
        followUpQuestions: [
          'What led you to that conclusion?',
          'What evidence supports this view?',
        ],
        insights: ['Shows logical reasoning', 'Demonstrates domain awareness'],
        suggestedPaths: [
          'Explore underlying assumptions',
          'Examine alternative perspectives',
        ],
      };
    }
  }

  private generateFallbackInquiry(request: InquiryRequest): InquiryResponse {
    const technique = request.technique || this.defaultTechnique;

    const fallbackQuestions: Record<InquiryTechnique, string[]> = {
      [InquiryTechnique.ELENCHUS]: [
        'What assumptions are you making about this problem?',
        'How do you know this to be true?',
        'What evidence contradicts your current understanding?',
      ],
      [InquiryTechnique.MAIEUTICS]: [
        'What do you already know about this topic?',
        'How does this connect to your previous experience?',
        'What patterns do you notice?',
      ],
      [InquiryTechnique.DIALECTIC]: [
        'What would someone who disagrees with you say?',
        'How would you reconcile these opposing views?',
        'What synthesis emerges from this tension?',
      ],
      [InquiryTechnique.APORIA]: [
        'What makes this problem more complex than it first appears?',
        "What don't we know that we need to know?",
        'Where does certainty give way to uncertainty?',
      ],
      [InquiryTechnique.IRONY]: [
        'Could you teach this to someone else?',
        'What would an expert find obvious here?',
        'What am I missing about this topic?',
      ],
    };

    return {
      questions: fallbackQuestions[technique],
      technique,
      explorationPaths: [
        'Fundamental analysis',
        'Alternative approaches',
        'Practical applications',
      ],
      resources: [
        {
          type: 'documentation',
          title: 'Getting Started Guide',
          whyRelevant: 'Provides foundational understanding',
          cognitiveLoad: request.context.complexity,
          estimatedReadTime: 15,
        },
      ],
      nextSteps: [
        'Define the problem clearly',
        'Gather more information',
        'Test your assumptions',
      ],
      cognitiveLoad: request.context.complexity,
    };
  }

  private generateFallbackTechniqueResponse(_technique: InquiryTechnique): {
    followUpQuestions: string[];
    insights: string[];
    suggestedPaths: string[];
  } {
    return {
      followUpQuestions: [
        'Can you elaborate on that point?',
        'What led you to that conclusion?',
      ],
      insights: [
        'Shows thoughtful consideration',
        'Demonstrates engagement with the topic',
      ],
      suggestedPaths: [
        'Explore deeper',
        'Consider alternatives',
        'Test assumptions',
      ],
    };
  }

  private generateFallbackExplorationPaths(
    domain: string,
    _complexity: ComplexityLevel,
  ): {
    paths: {
      name: string;
      description: string;
      questions: string[];
      difficulty: 'easy' | 'moderate' | 'challenging';
      estimatedTime: string;
    }[];
  } {
    return {
      paths: [
        {
          name: 'Fundamentals Review',
          description: `Core concepts and principles in ${domain}`,
          questions: [
            'What are the basic building blocks?',
            'How do these concepts interconnect?',
          ],
          difficulty: 'easy' as const,
          estimatedTime: '30-45 minutes',
        },
        {
          name: 'Practical Applications',
          description: `Real-world implementation in ${domain}`,
          questions: [
            'How is this used in practice?',
            'What challenges arise in implementation?',
          ],
          difficulty: 'moderate' as const,
          estimatedTime: '1-2 hours',
        },
        {
          name: 'Advanced Concepts',
          description: `Complex theories and edge cases in ${domain}`,
          questions: [
            'What are the limitations?',
            'How do experts approach this?',
          ],
          difficulty: 'challenging' as const,
          estimatedTime: '2-3 hours',
        },
      ],
    };
  }
}
