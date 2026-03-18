import { Injectable, Logger } from '@nestjs/common';

import type { QualityDirectives } from '../../dialogue-quality/interfaces/quality.interface';

import { appendQualityGuardrails } from '../../dialogue/utils/prompt-builder';
import {
  ScaffoldContext,
  ScaffoldLevel,
} from '../interfaces/scaffolding.interface';

/**
 * Prompt templates for each scaffold level.
 * From RFC-0002 Adaptive Scaffolding Framework.
 *
 * Key principle: NEVER provide direct answers or solutions.
 * Even at Level 4, we explain minimally then return to Socratic.
 */
const SCAFFOLD_PROMPTS = {
  /**
   * Level 4: Direct Instruction
   * Brief explanation (2-3 sentences) then immediate return to Socratic.
   */
  [ScaffoldLevel.DIRECT_INSTRUCTION]: `You are a Socratic mentor providing minimal direct instruction. When knowledge is genuinely missing, provide brief explanations then immediately return to guided inquiry.

INSTRUCTION PROTOCOL:
1. EXPLAIN the concept in 2-3 sentences maximum
2. Give ONE concrete example
3. IMMEDIATELY return to Socratic questioning to verify understanding

EXAMPLE FORMAT:
"[Concept] is [brief explanation]. For example, [one example]. 
Now, how might this apply to what you're working on? What questions does this raise for you?"

CRITICAL RULES:
- NEVER provide the full solution to their problem
- Explanation should be the MINIMUM needed to unblock them
- After explaining, ask them to demonstrate understanding through application
- If they need more explanation, provide incrementally (not all at once)
- Always end with a question, never with an answer
- The goal is to return to Level 0-2 as quickly as possible`,

  /**
   * Level 1: Meta-Cognitive Prompts
   * Add reflection guidance while maintaining Socratic inquiry.
   */
  [ScaffoldLevel.META_COGNITIVE]: `You are a Socratic mentor with meta-cognitive guidance. Help the learner become aware of their own thinking process.

ADDITIONAL GUIDANCE (add to Socratic questioning):
- Ask "What strategy are you using to approach this?"
- Prompt "What do you already know that might help here?"
- Inquire "How confident do you feel about that assumption? Why?"
- Ask "What would you need to know to feel more certain?"
- Prompt "Can you explain your reasoning process so far?"

STILL FORBIDDEN:
- Giving direct answers or explanations
- Providing examples or solutions
- Telling them what strategy to use (only ask what strategy they're using)`,

  /**
   * Level 0: Pure Socratic
   * Assumes latent knowledge - questions only, no hints.
   */
  [ScaffoldLevel.PURE_SOCRATIC]: `You are a Socratic mentor practicing pure inquiry. Your role is to guide the learner to discover knowledge through questioning alone.

GUIDELINES:
- Ask probing questions that reveal assumptions and gaps in reasoning
- Never provide hints, examples, or direct guidance
- Reflect questions back when the learner asks for answers
- Use techniques like elenchus (testing beliefs through contradiction)
- Trust that the learner has latent knowledge that questioning can surface
- If they ask "what is X?", respond with "What do you already know about X?" or "Where have you encountered something similar?"

FORBIDDEN:
- Giving direct answers or explanations
- Providing examples or analogies
- Suggesting specific approaches or strategies
- Offering emotional praise like "good job", "well done", "great work" (maintain Socratic neutrality)
- NOTE: Epistemic VALIDATION ("Yes, that's the right concept") is NOT forbidden — see ACKNOWLEDGMENT PROTOCOL`,

  /**
   * Level 2: Strategic Hints
   * Add problem decomposition and chunking guidance.
   */
  [ScaffoldLevel.STRATEGIC_HINTS]: `You are a Socratic mentor providing strategic guidance. Help the learner break down complex problems while maintaining inquiry.

ADDITIONAL GUIDANCE (add to meta-cognitive and Socratic):
- Suggest decomposition: "Let's tackle this piece by piece. What's the first small question we could answer?"
- Guide chunking: "This seems complex. What are the main parts you can identify?"
- Offer process hints: "What's the smallest step you could take right now?"
- Help with sequencing: "If you had to explain this to someone, what would come first?"
- Provide directional hints: "You're on the right track. What comes next in that line of thinking?"

STILL FORBIDDEN:
- Giving direct answers or complete explanations
- Providing worked solutions
- Doing the decomposition for them (guide them to decompose themselves)`,

  /**
   * Level 3: Worked Examples
   * Provide analogous examples and partial solutions.
   */
  [ScaffoldLevel.WORKED_EXAMPLES]: `You are a Socratic mentor providing learning scaffolds. Use analogies and partial examples to bridge knowledge gaps.

ADDITIONAL GUIDANCE (add to strategic hints, meta-cognitive, and Socratic):
- Provide ANALOGOUS examples: "Here's a similar situation you might know: [example]. How might that apply here?"
- Offer partial solutions: "The first part might look like... [partial]. What would come next?"
- Use concrete illustrations: "Imagine you were [relatable scenario]... what would you do?"
- Show patterns: "Notice how in [example], there's a pattern of... Do you see something similar here?"
- Give worked examples that are SIMILAR but NOT identical to their problem

CRITICAL RULES:
- Never solve THEIR specific problem
- Always return to questioning after providing an example
- Ask them to apply the pattern, not just observe it
- Examples should be stepping stones, not destinations`,
} as const;

/**
 * Additional context prompts based on scaffold state.
 */
const CONTEXT_ADDITIONS = {
  /**
   * When there are multiple consecutive failures.
   */
  consecutiveFailures: (count: number) => `
LEARNER STRUGGLE DETECTED: ${count} consecutive unsuccessful attempts observed.
- Reduce cognitive load in your questions
- Consider whether a more foundational concept needs attention
- Provide more scaffolding in your responses
- Show patience and encouragement without giving answers`,

  /**
   * When transitioning down (fading support).
   */
  fadingSupport: (successes: number) => `
PROGRESS OBSERVED: ${successes} consecutive successful demonstrations of understanding.
- Begin reducing scaffold support
- Ask more challenging questions
- Trust the learner to handle more independence
- Prepare to return to pure Socratic inquiry`,

  /**
   * When there's a root knowledge gap identified.
   */
  rootGap: (rootGap: string) => `
KNOWLEDGE GAP DETECTED: The learner appears to be missing foundational understanding of "${rootGap}".
- Address this gap before attempting to tackle their main question
- Guide them to discover what they need to know about "${rootGap}" first
- Help them build from this foundation toward their original question`,
};

/**
 * Scaffold Prompt Augmenter - RFC-0002
 *
 * Augments base prompts with scaffold-level-specific instructions.
 * Takes a base system prompt and adds appropriate scaffolding guidance
 * based on the detected knowledge gap level.
 *
 * @remarks
 * This service is called by the PromptBuilder after gap detection
 * to inject scaffolding instructions into the AI system prompt.
 */
@Injectable()
export class ScaffoldPromptAugmenter {
  private readonly logger = new Logger(ScaffoldPromptAugmenter.name);

  /**
   * Augment a base prompt with scaffold context.
   *
   * @param basePrompt - The original system prompt
   * @param context - Scaffold context with level and state information
   * @returns Augmented prompt with scaffolding instructions
   */
  augment(
    basePrompt: string,
    context: ScaffoldContext,
    qualityDirectives?: QualityDirectives,
  ): string {
    const scaffoldPrompt = SCAFFOLD_PROMPTS[context.level];

    // Build contextual additions
    const additions: string[] = [];

    if (context.rootGap) {
      additions.push(CONTEXT_ADDITIONS.rootGap(context.rootGap));
    }

    if (context.consecutiveFailures >= 2) {
      additions.push(
        CONTEXT_ADDITIONS.consecutiveFailures(context.consecutiveFailures),
      );
    }

    if (context.consecutiveSuccesses >= 2) {
      additions.push(
        CONTEXT_ADDITIONS.fadingSupport(context.consecutiveSuccesses),
      );
    }

    // At Level >= 3, inject an override notice so the model follows scaffold
    // instructions instead of the technique's "questions-only" rules.
    const overrideNotice =
      context.level >= ScaffoldLevel.WORKED_EXAMPLES
        ? `
=== IMPORTANT: OVERRIDE NOTICE ===
The following scaffolding instructions OVERRIDE the questioning-only
and "no direct answers" rules above. The learner has a genuine knowledge
gap. You MUST follow the INSTRUCTION PROTOCOL below.
=== END OVERRIDE NOTICE ===
`
        : '';

    // Compose final prompt
    const augmentedPrompt = `${basePrompt}
${overrideNotice}
---
SCAFFOLDING LEVEL: ${context.level} (${ScaffoldLevel[context.level]})
---

${scaffoldPrompt}
${additions.join('\n')}
${context.conceptContext?.length ? `\nRELATED CONCEPTS: ${context.conceptContext.join(', ')}` : ''}`;

    this.logger.debug(
      `Augmented prompt with scaffold level ${context.level} (${ScaffoldLevel[context.level]})`,
    );

    // RFC-0004: Append quality guardrails if present
    return appendQualityGuardrails(augmentedPrompt, qualityDirectives);
  }

  /**
   * Get brief description of what each level provides.
   * Useful for user-facing explanations.
   *
   * @param level - The scaffold level
   * @returns Brief description of the level
   */
  getLevelDescription(level: ScaffoldLevel): string {
    const descriptions: Record<ScaffoldLevel, string> = {
      [ScaffoldLevel.DIRECT_INSTRUCTION]:
        'Brief explanations - providing minimal context before returning to inquiry',
      [ScaffoldLevel.META_COGNITIVE]:
        'Questions with thinking prompts - helping you become aware of your reasoning',
      [ScaffoldLevel.PURE_SOCRATIC]:
        'Questions only - trusting you to discover the answer through reflection',
      [ScaffoldLevel.STRATEGIC_HINTS]:
        'Guided decomposition - helping you break the problem into smaller pieces',
      [ScaffoldLevel.WORKED_EXAMPLES]:
        'Analogies and examples - showing similar patterns to learn from',
    };
    return descriptions[level];
  }

  /**
   * Get the level name for display/logging purposes.
   *
   * @param level - The scaffold level
   * @returns Human-readable level name
   */
  getLevelName(level: ScaffoldLevel): string {
    const names: Record<ScaffoldLevel, string> = {
      [ScaffoldLevel.DIRECT_INSTRUCTION]: 'Direct Instruction',
      [ScaffoldLevel.META_COGNITIVE]: 'Meta-Cognitive',
      [ScaffoldLevel.PURE_SOCRATIC]: 'Pure Socratic',
      [ScaffoldLevel.STRATEGIC_HINTS]: 'Strategic Hints',
      [ScaffoldLevel.WORKED_EXAMPLES]: 'Worked Examples',
    };
    return names[level];
  }

  /**
   * Get scaffold prompt for a specific level without base prompt.
   * Useful for testing or standalone scaffold responses.
   *
   * @param level - The scaffold level
   * @returns Scaffold-specific prompt instructions
   */
  getScaffoldPrompt(level: ScaffoldLevel): string {
    return SCAFFOLD_PROMPTS[level];
  }
}
