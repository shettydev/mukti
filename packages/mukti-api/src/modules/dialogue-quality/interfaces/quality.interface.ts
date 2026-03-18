export interface MisconceptionResult {
  conceptName?: string;
  correctDirection?: string;
  detectedBelief?: string;
  fromCache: boolean;
  hasMisconception: boolean;
}

export interface PostResponseMetrics {
  questionCount: number;
  violations: string[];
}

export interface QualityAssessmentInput {
  conceptContext?: string[];
  consecutiveFailures: number;
  conversationHistory: { content: string; role: 'assistant' | 'user' }[];
  demonstratesUnderstanding?: boolean;
  scaffoldLevel: number;
  userId: string;
  userMessage: string;
}

export interface QualityDirective {
  instruction: string;
  priority: number; // lower = higher priority
  source:
    | 'acknowledgment'
    | 'breakthrough'
    | 'misconception'
    | 'single-question';
}

export interface QualityDirectives {
  directives: QualityDirective[];
  misconception?: MisconceptionResult;
}
