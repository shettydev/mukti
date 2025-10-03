export interface ReflectionEntry {
  id: string;
  sessionId: string;
  timestamp: Date;
  type: 'insight' | 'decision' | 'assumption_challenge' | 'pattern_recognition';
  content: string;
  confidence: number; // 1-10
  impact: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface ThinkingPattern {
  patternId: string;
  name: string;
  description: string;
  frequency: number;
  effectiveness: number; // 1-10
  contexts: string[];
  improvementSuggestions: string[];
}

export interface GrowthMetrics {
  sessionsCompleted: number;
  averageSessionDuration: number;
  insightsPerSession: number;
  questionQuality: number; // 1-10
  independentThinkingIncrease: number; // percentage
  domainMastery: DomainMastery[];
}

export interface DomainMastery {
  domain: string;
  level: number; // 1-100
  areasOfStrength: string[];
  areasForGrowth: string[];
  recommendedFocus: string[];
}

export interface CreateReflectionDto {
  sessionId: string;
  type: 'insight' | 'decision' | 'assumption_challenge' | 'pattern_recognition';
  content: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  tags?: string[];
}
