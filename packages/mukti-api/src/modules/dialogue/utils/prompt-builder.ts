import type { ProblemStructure } from '../../../schemas/canvas-session.schema';
import type { NodeType } from '../../../schemas/node-dialogue.schema';
import type { QualityDirectives } from '../../dialogue-quality/interfaces/quality.interface';

import {
  type ScaffoldContext,
  ScaffoldLevel,
} from '../../scaffolding/interfaces/scaffolding.interface';

/**
 * Node context for prompt construction.
 */
export interface NodeContext {
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeType;
}

/**
 * Socratic technique types for dialogue.
 */
export type SocraticTechnique =
  | 'analogical'
  | 'counterfactual'
  | 'definitional'
  | 'dialectic'
  | 'elenchus'
  | 'maieutics';

/**
 * Context used to select the appropriate Socratic technique for a ThoughtMap node.
 * RFC §5.1.1
 */
export interface ThoughtMapNodeTechniqueContext {
  /** Node depth in the tree (0 = root topic) */
  depth: number;
  /** Whether this node was created from a suggestion */
  fromSuggestion: boolean;
  /** Type of the parent node, if any */
  parentType?: NodeType;
  /** Number of sibling nodes (same parent) */
  siblings: number;
  /** Type of this node */
  type: NodeType;
}

/**
 * Builds a scaffold-aware system prompt that integrates gap detection results.
 * This is the main entry point for prompt building when scaffolding is enabled.
 *
 * @param node - The node context being discussed
 * @param problemStructure - The full problem structure from the canvas session
 * @param scaffoldContext - Optional scaffold context from gap detection
 * @param technique - The Socratic technique to use (defaults to 'elenchus')
 * @returns The constructed system prompt with scaffolding augmentation if provided
 *
 * @remarks
 * When scaffoldContext is provided, the base prompt is augmented with
 * scaffold-level-specific instructions from RFC-0002. This allows dynamic
 * adjustment of the AI's support level based on detected knowledge gaps.
 */
export function buildScaffoldAwarePrompt(
  node: NodeContext,
  problemStructure: ProblemStructure,
  scaffoldContext?: ScaffoldContext,
  technique: SocraticTechnique = 'elenchus',
  qualityDirectives?: QualityDirectives,
): string {
  // Build base prompt
  const basePrompt = buildSystemPrompt(node, problemStructure, technique);

  // If no scaffold context, append quality guardrails if present and return
  if (!scaffoldContext) {
    return appendQualityGuardrails(basePrompt, qualityDirectives);
  }

  // Import dynamically to avoid circular dependency
  // The ScaffoldPromptAugmenter provides the level-specific instructions
  // For direct integration, we inline the core augmentation logic here
  const scaffolded = augmentWithScaffoldContext(basePrompt, scaffoldContext);
  return appendQualityGuardrails(scaffolded, qualityDirectives);
}

/**
 * Builds the system prompt for AI-powered Socratic dialogue.
 *
 * @param node - The node context being discussed
 * @param problemStructure - The full problem structure from the canvas session
 * @param technique - The Socratic technique to use (defaults to 'elenchus')
 * @returns The constructed system prompt
 *
 * @remarks
 * The system prompt includes:
 * - Base Socratic mentor instructions
 * - Problem context (seed, soil, roots)
 * - Node-specific questioning instructions
 * - Technique-specific guidance
 */
export function buildSystemPrompt(
  node: NodeContext,
  problemStructure: ProblemStructure,
  technique: SocraticTechnique = 'elenchus',
): string {
  const techniqueDescription = getTechniqueDescription(technique);
  const nodeSpecificPrompt = getNodeSpecificPrompt(
    node.nodeType,
    node.nodeLabel,
  );

  const soilContext =
    problemStructure.soil.length > 0
      ? `Context (constraints): ${problemStructure.soil.join(', ')}`
      : 'Context (constraints): None specified';

  const rootsContext =
    problemStructure.roots.length > 0
      ? `Assumptions being examined: ${problemStructure.roots.join(', ')}`
      : 'Assumptions being examined: None specified';

  return `You are a Socratic mentor helping the user examine their thinking.
Your role is to ask thought-provoking questions, not provide answers.
Use the ${technique} technique to guide the dialogue.

${techniqueDescription}

The user is exploring a problem: "${problemStructure.seed}"

${soilContext}
${rootsContext}

${nodeSpecificPrompt}

Guidelines:
- Ask one focused question at a time
- Build on the user's previous responses
- Highlight contradictions or gaps in reasoning through questions
- Never provide direct answers or solutions
- Guide the user toward their own insights
- Be supportive but challenging
- Keep responses concise (2-4 sentences typically)`;
}

/**
 * Builds the system prompt for Thought Map node dialogue.
 * Substitutes map context (title + node summary) instead of canvas problem structure.
 *
 * @param node - The node context being discussed
 * @param mapTitle - The Thought Map's root topic/title
 * @param technique - The Socratic technique to apply
 * @returns The constructed system prompt
 */
export function buildThoughtMapSystemPrompt(
  node: NodeContext,
  mapTitle: string,
  technique: SocraticTechnique,
): string {
  const techniqueDescription = getTechniqueDescription(technique);
  const nodeSpecificPrompt = getThoughtMapNodePrompt(
    node.nodeType,
    node.nodeLabel,
  );

  return `You are a Socratic mentor helping the user explore their thinking map.
Your role is to ask thought-provoking questions, not provide answers.
Use the ${technique} technique to guide the dialogue.

${techniqueDescription}

The user is exploring the topic: "${mapTitle}"

The current node they are examining: "${node.nodeLabel}" (type: ${node.nodeType})

${nodeSpecificPrompt}

Guidelines:
- Ask one focused question at a time
- Build on the user's previous responses
- Highlight contradictions or gaps in reasoning through questions
- Never provide direct answers or solutions
- Guide the user toward their own insights
- Be supportive but challenging
- Keep responses concise (2-4 sentences typically)`;
}

/**
 * Generates an initial Socratic question for a node.
 *
 * @param nodeType - The type of node
 * @param nodeLabel - The node's content/label
 * @returns An initial question to start the dialogue
 *
 * @remarks
 * The initial question is tailored to the node type:
 * - Root (assumption): Challenges validity and asks for evidence
 * - Soil (constraint): Explores whether it's truly fixed
 * - Seed (problem): Explores root causes and prior attempts
 * - Insight: Explores implications and connections
 */
export function generateInitialQuestion(
  nodeType: NodeType,
  nodeLabel: string,
): string {
  switch (nodeType) {
    case 'insight':
      return `You've discovered: "${nodeLabel}". How does this change your understanding of the original problem? What new questions does this raise?`;

    case 'root':
      return `You've identified "${nodeLabel}" as an assumption. What evidence do you have that supports this belief? Have you considered what might happen if this assumption were incorrect?`;

    case 'seed':
      return `Let's explore your problem: "${nodeLabel}". Before we dive in, what do you think is the root cause? What have you already tried?`;

    case 'soil':
      return `You've noted "${nodeLabel}" as a constraint. Is this truly fixed, or might there be ways to work around it? What would change if this constraint didn't exist?`;

    default:
      return `Tell me more about "${nodeLabel}". What aspects would you like to explore?`;
  }
}

/**
 * Generates an initial Socratic question for a ThoughtMap node.
 *
 * @param nodeType - The ThoughtMap node type
 * @param nodeLabel - The node's content/label
 * @returns An initial question tailored to the node type
 */
export function generateThoughtMapInitialQuestion(
  nodeType: NodeType,
  nodeLabel: string,
): string {
  switch (nodeType) {
    case 'insight':
      return `You've reached an insight: "${nodeLabel}". How does this connect back to the original topic? What new paths does this open up?`;

    case 'question':
      return `You're asking: "${nodeLabel}". What assumptions are embedded in this question itself? What would it mean if the answer were different from what you expect?`;

    case 'thought':
      return `You've noted: "${nodeLabel}". What led you to this thought? Is this an observation, an assumption, or a conclusion?`;

    case 'topic':
      return `Let's begin exploring: "${nodeLabel}". What do you already believe about this topic, and what feels most uncertain to you?`;

    default:
      return `Tell me more about "${nodeLabel}". What aspects would you like to explore first?`;
  }
}

/**
 * Gets node-specific prompt instructions based on node type.
 *
 * @param nodeType - The type of node being discussed
 * @param nodeLabel - The node's content/label
 * @returns Node-specific instructions for the AI
 */
export function getNodeSpecificPrompt(
  nodeType: NodeType,
  nodeLabel: string,
): string {
  switch (nodeType) {
    case 'insight':
      return `The user discovered this insight: "${nodeLabel}"
Help them explore the implications and how it connects to their original problem.
Ask how this insight changes their understanding of the situation.
Explore what actions or decisions this insight might inform.
Consider whether this insight reveals new questions to explore.`;

    case 'root':
      return `The user is examining an assumption: "${nodeLabel}"
Challenge the validity of this assumption. Ask for evidence.
Explore what would change if this assumption were false.
Investigate the source of this belief and whether it has been tested.
Consider alternative assumptions that might be equally or more valid.`;

    case 'seed':
      return `The user wants to explore the core problem statement: "${nodeLabel}"
Ask questions that help clarify the problem and identify hidden assumptions.
Focus on understanding what the user truly wants to achieve and why.
Explore whether the problem as stated is the real problem or a symptom of something deeper.`;

    case 'soil':
      return `The user is examining a constraint: "${nodeLabel}"
Ask questions that explore whether this constraint is truly fixed or if there's flexibility.
Challenge whether this is a real limitation or a perceived one.
Explore the origins of this constraint and whether it can be reframed.
Consider what opportunities might exist within or around this constraint.`;

    default:
      return `The user is exploring: "${nodeLabel}"
Ask questions that help deepen their understanding of this aspect of their problem.`;
  }
}

/**
 * Determines the appropriate Socratic technique based on node type.
 *
 * @param nodeType - The type of node
 * @returns The recommended Socratic technique
 */
export function getRecommendedTechnique(nodeType: NodeType): SocraticTechnique {
  switch (nodeType) {
    case 'insight':
      return 'dialectic'; // Synthesis for insights
    case 'root':
      return 'elenchus'; // Cross-examination for assumptions
    case 'seed':
      return 'maieutics'; // Draw out understanding for problems
    case 'soil':
      return 'counterfactual'; // What-if for constraints
    default:
      return 'elenchus';
  }
}

/**
 * Selects the appropriate Socratic technique for a ThoughtMap node.
 * Priority order mirrors RFC §5.1.1.
 *
 * @param ctx - Context about the node's position and type in the map
 * @returns The most appropriate SocraticTechnique
 */
export function selectTechniqueForNode(
  ctx: ThoughtMapNodeTechniqueContext,
): SocraticTechnique {
  if (ctx.depth === 0) {
    return 'maieutics';
  }
  if (ctx.fromSuggestion) {
    return 'elenchus';
  }
  if (ctx.type === 'insight') {
    return 'dialectic';
  }
  if (ctx.siblings >= 3) {
    return 'counterfactual';
  }
  if (ctx.depth >= 3) {
    return 'analogical';
  }
  if (ctx.parentType === 'question') {
    return 'definitional';
  }
  return 'maieutics';
}

/**
 * Appends quality guardrails section to a prompt if directives are present.
 * RFC-0004: Dialogue Quality Guardrails.
 */
function appendQualityGuardrails(
  prompt: string,
  qualityDirectives?: QualityDirectives,
): string {
  if (!qualityDirectives || qualityDirectives.directives.length === 0) {
    return prompt;
  }

  const directiveLines = qualityDirectives.directives
    .map((d) => `- ${d.instruction}`)
    .join('\n');

  return `${prompt}

---
QUALITY GUARDRAILS
---
${directiveLines}`;
}

/**
 * Augments a base prompt with scaffold context.
 * Inline implementation to avoid circular module dependencies.
 *
 * @param basePrompt - The base system prompt
 * @param context - Scaffold context with level and state
 * @returns Augmented prompt with scaffolding instructions
 */
function augmentWithScaffoldContext(
  basePrompt: string,
  context: ScaffoldContext,
): string {
  const scaffoldInstructions = getScaffoldLevelInstructions(context.level);
  const levelName = getScaffoldLevelName(context.level);

  // Build contextual additions
  const additions: string[] = [];

  if (context.rootGap) {
    additions.push(`
KNOWLEDGE GAP DETECTED: The learner appears to be missing foundational understanding of "${context.rootGap}".
- Address this gap before attempting to tackle their main question
- Guide them to discover what they need to know about "${context.rootGap}" first
- Help them build from this foundation toward their original question`);
  }

  if (context.consecutiveFailures >= 2) {
    additions.push(`
LEARNER STRUGGLE DETECTED: ${context.consecutiveFailures} consecutive unsuccessful attempts observed.
- Reduce cognitive load in your questions
- Consider whether a more foundational concept needs attention
- Provide more scaffolding in your responses
- Show patience and encouragement without giving answers`);
  }

  if (context.consecutiveSuccesses >= 2) {
    additions.push(`
PROGRESS OBSERVED: ${context.consecutiveSuccesses} consecutive successful demonstrations of understanding.
- Begin reducing scaffold support
- Ask more challenging questions
- Trust the learner to handle more independence
- Prepare to return to pure Socratic inquiry`);
  }

  // At Level >= 3 (WORKED_EXAMPLES, DIRECT_INSTRUCTION), inject an override notice
  // so the model follows scaffold instructions instead of the technique's "questions-only" rules.
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
  return `${basePrompt}
${overrideNotice}
---
SCAFFOLDING LEVEL: ${context.level} (${levelName})
---

${scaffoldInstructions}
${additions.join('\n')}
${context.conceptContext?.length ? `\nRELATED CONCEPTS: ${context.conceptContext.join(', ')}` : ''}`;
}

/**
 * Gets scaffold level instructions based on RFC-0002.
 */
function getScaffoldLevelInstructions(level: number): string {
  switch (level) {
    case 0: // PURE_SOCRATIC
      return `You are a Socratic mentor practicing pure inquiry. Your role is to guide the learner to discover knowledge through questioning alone.

GUIDELINES:
- Ask probing questions that reveal assumptions and gaps in reasoning
- Never provide hints, examples, or direct guidance
- Reflect questions back when the learner asks for answers
- Trust that the learner has latent knowledge that questioning can surface

FORBIDDEN:
- Giving direct answers or explanations
- Providing examples or analogies
- Suggesting specific approaches or strategies`;

    case 1: // META_COGNITIVE
      return `You are a Socratic mentor with meta-cognitive guidance. Help the learner become aware of their own thinking process.

ADDITIONAL GUIDANCE:
- Ask "What strategy are you using to approach this?"
- Prompt "What do you already know that might help here?"
- Inquire "How confident do you feel about that assumption? Why?"

STILL FORBIDDEN:
- Giving direct answers or explanations
- Providing examples or solutions`;

    case 2: // STRATEGIC_HINTS
      return `You are a Socratic mentor providing strategic guidance. Help the learner break down complex problems while maintaining inquiry.

ADDITIONAL GUIDANCE:
- Suggest decomposition: "Let's tackle this piece by piece. What's the first small question we could answer?"
- Guide chunking: "This seems complex. What are the main parts you can identify?"
- Offer process hints: "What's the smallest step you could take right now?"

STILL FORBIDDEN:
- Giving direct answers or complete explanations
- Providing worked solutions`;

    case 3: // WORKED_EXAMPLES
      return `You are a Socratic mentor providing learning scaffolds. Use analogies and partial examples to bridge knowledge gaps.

ADDITIONAL GUIDANCE:
- Provide ANALOGOUS examples: "Here's a similar situation you might know: [example]. How might that apply here?"
- Offer partial solutions: "The first part might look like... [partial]. What would come next?"
- Show patterns: "Notice how in [example], there's a pattern of... Do you see something similar here?"

CRITICAL RULES:
- Never solve THEIR specific problem
- Always return to questioning after providing an example`;

    case 4: // DIRECT_INSTRUCTION
      return `You are a Socratic mentor providing minimal direct instruction. When knowledge is genuinely missing, provide brief explanations then immediately return to guided inquiry.

INSTRUCTION PROTOCOL:
1. EXPLAIN the concept in 2-3 sentences maximum
2. Give ONE concrete example
3. IMMEDIATELY return to Socratic questioning to verify understanding

CRITICAL RULES:
- NEVER provide the full solution to their problem
- Explanation should be the MINIMUM needed to unblock them
- Always end with a question, never with an answer
- The goal is to return to Level 0-2 as quickly as possible`;

    default:
      return '';
  }
}

/**
 * Gets scaffold level name for display.
 */
function getScaffoldLevelName(level: number): string {
  const names: Record<number, string> = {
    0: 'Pure Socratic',
    1: 'Meta-Cognitive',
    2: 'Strategic Hints',
    3: 'Worked Examples',
    4: 'Direct Instruction',
  };
  return names[level] ?? 'Unknown';
}

/**
 * Gets the description for a Socratic technique.
 *
 * @param technique - The Socratic technique
 * @returns Description of how to apply the technique
 */
function getTechniqueDescription(technique: SocraticTechnique): string {
  switch (technique) {
    case 'analogical':
      return `Technique: Analogical Reasoning
Draw comparisons between the user's situation and familiar analogies to illuminate patterns and principles they may not yet see.`;

    case 'counterfactual':
      return `Technique: Counterfactual Reasoning
Ask "what if" questions that explore alternative scenarios and help the user understand the implications of their assumptions.`;

    case 'definitional':
      return `Technique: Definitional Inquiry
Press the user to precisely define their key terms and concepts. Explore whether their definitions hold up under scrutiny and edge cases.`;

    case 'dialectic':
      return `Technique: Dialectic (Thesis-Antithesis-Synthesis)
Guide the user through examining opposing viewpoints to arrive at a higher understanding that reconciles apparent contradictions.`;

    case 'elenchus':
      return `Technique: Elenchus (Cross-examination)
Focus on testing the consistency of the user's beliefs by asking probing questions that reveal contradictions or gaps in their reasoning.`;

    case 'maieutics':
      return `Technique: Maieutics (Midwifery)
Help the user "give birth" to their own ideas by asking questions that draw out latent knowledge and insights they already possess.`;

    default:
      return `Technique: Socratic Questioning
Use open-ended questions to help the user examine their beliefs and reasoning.`;
  }
}

/**
 * Gets node-specific prompt instructions for ThoughtMap node types.
 */
function getThoughtMapNodePrompt(
  nodeType: NodeType,
  nodeLabel: string,
): string {
  switch (nodeType) {
    case 'insight':
      return `The user has arrived at an insight: "${nodeLabel}"
Help them explore its implications and how it illuminates the broader topic.
Ask how this insight might change their approach or understanding.
Probe whether this insight raises further questions.`;

    case 'question':
      return `The user is examining a question: "${nodeLabel}"
Explore what assumptions are embedded in the question.
Ask what answering this question would unlock.
Challenge whether this is the right question to be asking.`;

    case 'thought':
      return `The user is developing a thought: "${nodeLabel}"
Explore whether this is a fact, belief, or inference.
Ask for evidence and alternative interpretations.
Probe how this thought connects to other nodes in their map.`;

    case 'topic':
      return `The user is exploring the root topic: "${nodeLabel}"
Help them unpack their core beliefs and assumptions about this topic.
Ask what they already know versus what they are uncertain about.
Guide them toward identifying the key questions worth exploring.`;

    default:
      return `The user is exploring: "${nodeLabel}"
Ask questions that deepen their understanding of this aspect of their thinking.`;
  }
}
