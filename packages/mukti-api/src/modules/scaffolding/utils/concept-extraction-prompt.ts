/**
 * Concept Extraction Prompt - LLM-assisted concept discovery
 *
 * Used by KnowledgeGapDetectorService to extract concepts from user messages
 * when keyword matching fails. This is a fast classification call, not a dialogue prompt.
 */

export const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `You are a concept extraction system for an educational platform. Given a user message from a learning/thinking context, identify the key concepts being discussed.

Rules:
- Extract 1-5 concepts from the message
- For each concept, list 1-3 prerequisite concepts needed to understand it
- Concept IDs must be lowercase, underscore-separated (e.g., "linear_algebra", "supply_chain")
- Be domain-agnostic: concepts can be from any field (programming, philosophy, economics, cooking, etc.)
- Prerequisites should be foundational — things a learner needs to know BEFORE tackling the main concept
- If the message is too vague or conversational to extract concepts, return an empty array

Return ONLY valid JSON, no markdown fences or explanation.`;

export interface ConceptExtractionResult {
  concepts: ExtractedConcept[];
}

export interface ExtractedConcept {
  /** Estimated difficulty */
  difficulty: 'advanced' | 'beginner' | 'intermediate';
  /** Domain category */
  domain:
    | 'general'
    | 'logic'
    | 'mathematics'
    | 'problem-solving'
    | 'programming';
  /** Lowercase underscore-separated ID */
  id: string;
  /** Keyword aliases for future keyword matching */
  keywords: string[];
  /** Human-readable name */
  name: string;
  /** Prerequisite concept IDs */
  prerequisites: string[];
}

export function buildConceptExtractionUserPrompt(message: string): string {
  return `Extract concepts from this user message:

"${message}"

Response format:
{"concepts":[{"id":"concept_id","name":"Concept Name","prerequisites":["prereq_id"],"difficulty":"beginner|intermediate|advanced","domain":"programming|mathematics|logic|problem-solving|general","keywords":["alias1","alias2"]}]}`;
}

/**
 * Default BKT parameters based on concept difficulty.
 */
export function getDefaultBktParamsForDifficulty(
  difficulty: 'advanced' | 'beginner' | 'intermediate',
) {
  switch (difficulty) {
    case 'advanced':
      return { pGuess: 0.2, pInit: 0.2, pLearn: 0.1, pSlip: 0.12 };
    case 'beginner':
      return { pGuess: 0.3, pInit: 0.4, pLearn: 0.2, pSlip: 0.08 };
    case 'intermediate':
      return { pGuess: 0.25, pInit: 0.3, pLearn: 0.15, pSlip: 0.1 };
  }
}

/** Max new concepts a single user can trigger per hour */
export const CONCEPT_CREATION_RATE_LIMIT = 10;

/** Minimum concepts from keyword match before falling back to LLM */
export const MIN_KEYWORD_CONCEPTS_THRESHOLD = 2;

/** Force LLM extraction every N-th message to discover topic evolution */
export const LLM_EXTRACTION_INTERVAL = 5;
