import type { ComplexityLevel, InquiryTechnique } from '../enums';

export interface ThinkingSessionContext {
  domain: string;
  urgency: 'low' | 'medium' | 'high';
  complexity: ComplexityLevel;
  priorAttempts: string[];
  learningGoals: string[];
}

export interface SessionProgress {
  currentStage: string;
  completedStages: string[];
  insightsGenerated: number;
  questionsExplored: number;
  resourcesConsulted: number;
  reflectionPoints: number;
}

export interface CreateThinkingSessionDto {
  initialStatement: string;
  context: ThinkingSessionContext;
  preferredTechnique?: InquiryTechnique;
}

export interface UpdateSessionProgressDto {
  discoveries: string[];
  newUnderstanding: string;
  questionsAnswered: string[];
  resourcesUsed: string[];
}
