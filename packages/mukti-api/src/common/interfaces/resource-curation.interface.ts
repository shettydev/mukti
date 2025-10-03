import type { ResourceType, ComplexityLevel } from '../enums';

export interface ResourceDiscoveryRequest {
  context: string;
  level: ComplexityLevel;
  domain: string;
  specificNeeds?: string[];
  excludeDomains?: string[];
}

export interface CuratedResource {
  id: string;
  type: ResourceType;
  title: string;
  url?: string;
  description: string;
  whyRelevant: string;
  cognitiveLoad: ComplexityLevel;
  estimatedTime: number;
  prerequisiteKnowledge: string[];
  followUpResources?: string[];
}

export interface LearningPath {
  pathId: string;
  title: string;
  description: string;
  resources: CuratedResource[];
  estimatedTotalTime: number;
  difficulty: ComplexityLevel;
  checkpoints: CheckPoint[];
}

export interface CheckPoint {
  name: string;
  questions: string[];
  requiredUnderstanding: string[];
  validationCriteria: string[];
}
