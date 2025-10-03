import type { ComplexityLevel, InquiryTechnique } from '../enums';

export interface InquiryContext {
  domain: string;
  complexity: ComplexityLevel;
  constraints: string[];
  priorKnowledge?: string[];
  learningObjectives?: string[];
  timeConstraints?: {
    session_duration_minutes?: number;
    total_exploration_time?: string;
  };
}

export interface InquiryRequest {
  context: InquiryContext;
  currentUnderstanding: string;
  technique: InquiryTechnique;
  sessionId?: string;
}

export interface InquiryResponse {
  questions: string[];
  technique: InquiryTechnique;
  explorationPaths: string[];
  resources: ResourceSuggestion[];
  nextSteps: string[];
  cognitiveLoad: ComplexityLevel;
}

export interface ResourceSuggestion {
  type: string;
  title: string;
  url?: string;
  whyRelevant: string;
  cognitiveLoad: ComplexityLevel;
  estimatedReadTime?: number;
}
