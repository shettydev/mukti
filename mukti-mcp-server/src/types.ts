/**
 * Type definitions for the Mukti MCP Server
 *
 * This module contains all the type definitions used across the Mukti MCP server,
 * including query types, Socratic techniques, resource types, and response structures.
 */

/**
 * Enum for different types of queries the user might have
 */
export enum QueryType {
  CODING = "coding",
  CREATIVE = "creative",
  DECISION_MAKING = "decision_making",
  PERSONAL_GROWTH = "personal_growth",
  LEARNING = "learning",
  PROBLEM_SOLVING = "problem_solving",
}

/**
 * Enum for different Socratic techniques
 */
export enum SocraticTechnique {
  ELENCHUS = "elenchus", // Cross-examination to reveal contradictions
  DIALECTIC = "dialectic", // Dialogue to explore opposing viewpoints
  MAIEUTICS = "maieutics", // Midwifery - helping birth ideas
  DEFINITIONAL = "definitional", // Seeking precise definitions
  ANALOGICAL = "analogical", // Using analogies and metaphors
  COUNTERFACTUAL = "counterfactual", // Exploring "what if" scenarios
}

/**
 * Type for a Socratic response
 */
export type SocraticResponse = {
  questions: string[];
  hints: string[];
  resources: ResourceLink[];
  technique: SocraticTechnique;
  nextSteps: string[];
};

/**
 * Type for resource links
 */
export type ResourceLink = {
  title: string;
  url: string;
  description: string;
  category: string;
};

/**
 * Type for exploration paths
 */
export type ExplorationPath = {
  id: string;
  title: string;
  description: string;
  questions: string[];
  resources: ResourceLink[];
};

/**
 * ! Note !
 * The types mentioned below are currently not in use.
 * However, they are a rough implementation for future features.
 */

/**
 * Type for user interaction session tracking
 */
export type UserSession = {
  sessionId: string;
  queryHistory: {
    query: string;
    queryType: QueryType;
    technique: SocraticTechnique;
    timestamp: Date;
    userFeedback?: "helpful" | "not_helpful" | "partially_helpful";
  }[];
  preferences: {
    preferredTechniques: SocraticTechnique[];
    avoidedTopics: string[];
    learningStyle: "visual" | "auditory" | "kinesthetic" | "reading" | "mixed";
  };
  progressTracking: {
    completedPaths: string[];
    currentPath?: string;
    skillsBeingDeveloped: string[];
  };
};

/**
 * Type for resource categorization
 */
export type ResourceCategory =
  | "debugging"
  | "problem-solving"
  | "creativity"
  | "decision-making"
  | "self-improvement"
  | "learning"
  | "philosophy"
  | "methodology"
  | "tools"
  | "documentation";

/**
 * Type for query difficulty levels
 */
export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

/**
 * Type for feedback on Socratic responses
 */
export type ResponseFeedback = {
  responseId: string;
  userId?: string;
  feedback: {
    helpfulness: 1 | 2 | 3 | 4 | 5;
    clarity: 1 | 2 | 3 | 4 | 5;
    technique_effectiveness: 1 | 2 | 3 | 4 | 5;
    would_recommend: boolean;
  };
  suggestions?: string;
  timestamp: Date;
};

/**
 * Type for Socratic conversation flow
 */
export type ConversationFlow = {
  stage: "initial" | "exploration" | "deepening" | "synthesis" | "reflection";
  questionsAsked: string[];
  userResponses: string[];
  insightsReached: string[];
  nextRecommendedActions: string[];
};

/**
 * Type for learning objectives
 */
export type LearningObjective = {
  id: string;
  title: string;
  description: string;
  queryType: QueryType;
  suggestedTechniques: SocraticTechnique[];
  estimatedTime: string;
  prerequisites: string[];
  successCriteria: string[];
};

/**
 * Type for dynamic resource suggestion
 */
export type DynamicResource = ResourceLink & {
  relevanceScore: number;
  difficultyLevel: DifficultyLevel;
  timeToComplete: string;
  prerequisites: string[];
  learningObjectives: string[];
};

/**
 * Type for Socratic prompt templates
 */
export type PromptTemplate = {
  id: string;
  name: string;
  technique: SocraticTechnique;
  queryType: QueryType;
  template: string;
  variables: string[];
  examples: {
    context: string;
    generated_prompt: string;
  }[];
};

/**
 * Type for user progress tracking
 */
export type ProgressMetrics = {
  totalQuestions: number;
  insightsReached: number;
  pathsCompleted: number;
  favoriteTopics: QueryType[];
  mostEffectiveTechniques: SocraticTechnique[];
  timeSpentLearning: number; // in minutes
  streakDays: number;
  lastActive: Date;
};

/**
 * Type for adaptation parameters
 */
export type AdaptationParameters = {
  pacing: "slow" | "moderate" | "fast";
  questionDepth: "surface" | "medium" | "deep";
  encouragementLevel: "minimal" | "moderate" | "high";
  resourceDetailLevel: "brief" | "detailed" | "comprehensive";
  followUpFrequency: "rare" | "occasional" | "frequent";
};
