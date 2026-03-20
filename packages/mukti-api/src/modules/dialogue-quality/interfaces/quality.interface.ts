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
  conclusionOffered?: boolean;
  consecutiveFailures: number;
  conversationHistory: { content: string; role: 'assistant' | 'user' }[];
  demonstratesUnderstanding?: boolean;
  scaffoldLevel: number;
  totalMessageCount?: number;
  userId: string;
  userMessage: string;
  wrapUpRequested?: boolean;
}

export interface QualityDirective {
  instruction: string;
  priority: number; // lower = higher priority
  source:
    | 'acknowledgment'
    | 'breakthrough'
    | 'conclusion'
    | 'misconception'
    | 'single-question';
}

export interface QualityDirectives {
  conclusionReady?: boolean;
  directives: QualityDirective[];
  misconception?: MisconceptionResult;
}
