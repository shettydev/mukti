export interface ProblemDecomposition {
  coreIssue: string;
  subProblems: string[];
  constraints: string[];
  assumptions: string[];
  stakeholders: string[];
  successCriteria: string[];
}

export interface AssumptionMapping {
  assumption: string;
  confidence: number; // 1-10
  impact: 'low' | 'medium' | 'high';
  validationMethod?: string;
  tested: boolean;
}

export interface CreateProblemCanvasDto {
  initialStatement: string;
  context: {
    domain: string;
    urgency: 'low' | 'medium' | 'high';
    priorAttempts: string[];
  };
}

export interface ExplorationSuggestion {
  path: string;
  questions: string[];
  expectedInsights: string[];
  difficulty: 'easy' | 'moderate' | 'challenging';
  estimatedTime: string;
}
