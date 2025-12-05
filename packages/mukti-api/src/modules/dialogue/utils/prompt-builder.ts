import type { ProblemStructure } from '../../../schemas/canvas-session.schema';
import type { NodeType } from '../../../schemas/node-dialogue.schema';

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
  | 'counterfactual'
  | 'dialectic'
  | 'elenchus'
  | 'maieutics';

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
 * Gets the description for a Socratic technique.
 *
 * @param technique - The Socratic technique
 * @returns Description of how to apply the technique
 */
function getTechniqueDescription(technique: SocraticTechnique): string {
  switch (technique) {
    case 'counterfactual':
      return `Technique: Counterfactual Reasoning
Ask "what if" questions that explore alternative scenarios and help the user understand the implications of their assumptions.`;

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
