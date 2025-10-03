import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';

import { SocraticInquiryService } from './socratic-inquiry.service';
import { InquiryTechnique, ComplexityLevel } from '../../common';
import { InquiryRequestDto } from './dto';

@Controller('inquiry')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SocraticInquiryController {
  constructor(
    private readonly socraticInquiryService: SocraticInquiryService,
  ) {}

  @Post('question')
  async generateQuestions(@Body() inquiryRequest: InquiryRequestDto) {
    const inquiry =
      await this.socraticInquiryService.generateInquiry(inquiryRequest);

    return {
      inquiry: {
        technique: inquiry.technique,
        questions: inquiry.questions,
        explorationPaths: inquiry.explorationPaths,
        nextSteps: inquiry.nextSteps,
        cognitiveLoad: inquiry.cognitiveLoad,
      },
      resources: inquiry.resources.map(resource => ({
        type: resource.type,
        title: resource.title,
        url: resource.url,
        whyRelevant: resource.whyRelevant,
        cognitiveLoad: resource.cognitiveLoad,
        estimatedReadTime: resource.estimatedReadTime,
      })),
      context: {
        sessionId: inquiryRequest.sessionId,
        technique: inquiryRequest.technique,
        domain: inquiryRequest.context.domain,
      },
    };
  }

  @Post('techniques/:technique')
  async applyTechnique(
    @Param('technique') technique: InquiryTechnique,
    @Body()
    body: {
      context: string;
      userResponse: string;
      domain: string;
    },
  ) {
    const result = await this.socraticInquiryService.applyTechnique(
      technique,
      body.context,
      body.userResponse,
      body.domain,
    );

    return {
      technique,
      result: {
        followUpQuestions: result.followUpQuestions,
        insights: result.insights,
        suggestedPaths: result.suggestedPaths,
      },
      guidance: this.getTechniqueGuidance(technique),
    };
  }

  @Get('paths')
  async getExplorationPaths(
    @Query('domain') domain: string,
    @Query('complexity') complexity: ComplexityLevel,
    @Query('currentFocus') currentFocus: string,
  ) {
    const result = await this.socraticInquiryService.generateExplorationPaths(
      domain,
      complexity,
      currentFocus,
    );

    return {
      explorationPaths: result.paths.map(path => ({
        name: path.name,
        description: path.description,
        questions: path.questions,
        difficulty: path.difficulty,
        estimatedTime: path.estimatedTime,
      })),
      metadata: {
        domain,
        complexity,
        currentFocus,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  @Get('techniques')
  getTechniques() {
    return {
      techniques: Object.values(InquiryTechnique).map(technique => ({
        name: technique,
        description: this.getTechniqueDescription(technique),
        bestUsedFor: this.getTechniqueBestUse(technique),
        example: this.getTechniqueExample(technique),
      })),
    };
  }

  @Get('techniques/:technique/guidance')
  getTechniqueGuidanceEndpoint(
    @Param('technique') technique: InquiryTechnique,
  ) {
    return {
      technique,
      guidance: this.getTechniqueGuidance(technique),
      principles: this.getTechniquePrinciples(technique),
      warnings: this.getTechniqueWarnings(technique),
    };
  }

  private getTechniqueDescription(technique: InquiryTechnique): string {
    const descriptions: Record<InquiryTechnique, string> = {
      [InquiryTechnique.ELENCHUS]:
        'Cross-examination to expose ignorance and inconsistencies in thinking',
      [InquiryTechnique.MAIEUTICS]:
        'Midwifery of ideas - helping birth knowledge that already exists within',
      [InquiryTechnique.DIALECTIC]:
        'Systematic reasoning through opposing viewpoints to reach truth',
      [InquiryTechnique.APORIA]:
        'Creating productive confusion to motivate deeper inquiry',
      [InquiryTechnique.IRONY]:
        'Feigned ignorance to encourage independent thinking and self-discovery',
    };
    return descriptions[technique];
  }

  private getTechniqueBestUse(technique: InquiryTechnique): string {
    const bestUses: Record<InquiryTechnique, string> = {
      [InquiryTechnique.ELENCHUS]:
        'Challenging assumptions and revealing logical inconsistencies',
      [InquiryTechnique.MAIEUTICS]:
        'Drawing out insights from existing knowledge and experience',
      [InquiryTechnique.DIALECTIC]:
        'Resolving complex issues through systematic reasoning',
      [InquiryTechnique.APORIA]:
        'Breaking through overconfidence and surface-level understanding',
      [InquiryTechnique.IRONY]:
        'Encouraging self-reliant thinking and discovery',
    };
    return bestUses[technique];
  }

  private getTechniqueExample(technique: InquiryTechnique): string {
    const examples: Record<InquiryTechnique, string> = {
      [InquiryTechnique.ELENCHUS]:
        '"You say X is true. But if X is true, wouldn\'t Y also have to be true? How do you reconcile this?"',
      [InquiryTechnique.MAIEUTICS]:
        '"What do you already know about similar situations? How might that knowledge apply here?"',
      [InquiryTechnique.DIALECTIC]:
        '"Let\'s consider both perspectives. How might we synthesize these opposing views?"',
      [InquiryTechnique.APORIA]:
        '"This seems straightforward, but what complexities might we be overlooking?"',
      [InquiryTechnique.IRONY]:
        '"I\'m confused by this topic. Could you help me understand what makes it so clear to you?"',
    };
    return examples[technique];
  }

  private getTechniqueGuidance(technique: InquiryTechnique): string {
    const guidance: Record<InquiryTechnique, string> = {
      [InquiryTechnique.ELENCHUS]:
        'Focus on logical consistency. Ask questions that reveal contradictions and force examination of premises.',
      [InquiryTechnique.MAIEUTICS]:
        'Guide the learner to discover insights they already possess. Ask questions that connect new problems to familiar experiences.',
      [InquiryTechnique.DIALECTIC]:
        'Present opposing viewpoints systematically. Help synthesize apparent contradictions into deeper understanding.',
      [InquiryTechnique.APORIA]:
        'Introduce complexity gradually. Reveal layers of difficulty to prevent oversimplification.',
      [InquiryTechnique.IRONY]:
        'Express genuine curiosity. Let your questions demonstrate that simple questions often have complex answers.',
    };
    return guidance[technique];
  }

  private getTechniquePrinciples(technique: InquiryTechnique): string[] {
    const principles: Record<InquiryTechnique, string[]> = {
      [InquiryTechnique.ELENCHUS]: [
        'Every belief should be examined',
        'Contradictions reveal flawed reasoning',
        "Question the questioner's assumptions too",
      ],
      [InquiryTechnique.MAIEUTICS]: [
        'Knowledge exists within, waiting to be discovered',
        'Connect unknown to known',
        "Guide, don't tell",
      ],
      [InquiryTechnique.DIALECTIC]: [
        'Truth emerges through opposition',
        'Synthesis transcends thesis and antithesis',
        'Maintain respect for all viewpoints',
      ],
      [InquiryTechnique.APORIA]: [
        'Confusion precedes clarity',
        'Difficulty reveals depth',
        'Embrace productive uncertainty',
      ],
      [InquiryTechnique.IRONY]: [
        "Wisdom begins with knowing you don't know",
        'Questions reveal more than answers',
        'Genuine humility enables learning',
      ],
    };
    return principles[technique];
  }

  private getTechniqueWarnings(technique: InquiryTechnique): string[] {
    const warnings: Record<InquiryTechnique, string[]> = {
      [InquiryTechnique.ELENCHUS]: [
        "Don't use this to attack or embarrass",
        'Avoid leading to cynicism or relativism',
        'Balance challenge with support',
      ],
      [InquiryTechnique.MAIEUTICS]: [
        'Not all knowledge can be drawn out',
        'Avoid assuming all answers are internal',
        'Some topics require external input',
      ],
      [InquiryTechnique.DIALECTIC]: [
        "Don't create false dichotomies",
        'Avoid endless debate without resolution',
        'Ensure both sides are genuinely represented',
      ],
      [InquiryTechnique.APORIA]: [
        "Don't leave learners permanently confused",
        'Provide scaffolding for complexity',
        'Know when to provide clarity',
      ],
      [InquiryTechnique.IRONY]: [
        'Avoid condescension or sarcasm',
        "Don't fake ignorance obviously",
        'Balance humility with guidance',
      ],
    };
    return warnings[technique];
  }
}
