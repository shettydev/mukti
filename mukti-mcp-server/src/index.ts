#!/usr/bin/env node

/**
 * Mukti MCP Server - A Socratic AI assistant that guides users to think for themselves
 * rather than providing direct answers. Implements the Socratic method through guided
 * questioning, resource curation, and transparency features.
 *
 * Key principles:
 * - Strict Prompt Engineering: Avoid direct answers, focus on questions and hints
 * - Resource Curation: Provide links to documentation and articles instead of answers
 * - Socratic Method: Use elenchus, dialectic, and maieutics techniques
 * - User-Driven Exploration: Let users choose their learning path
 * - Transparency: Make the platform's purpose clear
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Import types and response strategies
import {
  ExplorationPath,
  QueryType,
  ResourceLink,
  SocraticTechnique,
} from "./types.js";

/**
 * Create an MCP server with capabilities for Socratic guidance
 */
const server = new Server(
  {
    name: "Mukti MCP Server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  },
);

/**
 * Core Socratic reasoning engine - generates questions based on query type
 */
class SocraticEngine {
  static generateQuestions(
    query: string,
    queryType: QueryType,
    technique: SocraticTechnique,
  ): string[] {
    const baseQuestions = this.getBaseQuestions(queryType, technique);
    const contextualQuestions = this.generateContextualQuestions(
      query,
      technique,
    );

    return [...baseQuestions, ...contextualQuestions];
  }

  static getBaseQuestions(
    queryType: QueryType,
    technique: SocraticTechnique,
  ): string[] {
    const questionMap = {
      [QueryType.CODING]: {
        [SocraticTechnique.ELENCHUS]: [
          "What assumptions are you making about this problem?",
          "Have you considered what might go wrong with this approach?",
          "What evidence do you have that this is the right solution?",
        ],
        [SocraticTechnique.DIALECTIC]: [
          "What are the trade-offs between different approaches?",
          "How might someone argue against your chosen solution?",
          "What alternative methods could solve this problem?",
        ],
        [SocraticTechnique.MAIEUTICS]: [
          "What do you already know that might help here?",
          "What patterns have you seen in similar problems?",
          "What would happen if you broke this down into smaller parts?",
        ],
        [SocraticTechnique.DEFINITIONAL]: [
          "How would you define the core problem you're trying to solve?",
          "What do you mean when you say this solution is 'correct'?",
          "How do you distinguish between a bug and a feature?",
        ],
        [SocraticTechnique.ANALOGICAL]: [
          "What real-world system does this code behavior remind you of?",
          "If this were a physical machine, what would be broken?",
          "What cooking or crafting process is similar to your debugging approach?",
        ],
        [SocraticTechnique.COUNTERFACTUAL]: [
          "What if this code had to run 1000 times slower?",
          "What if you couldn't use any external libraries?",
          "What if you had to explain this to someone who's never programmed?",
        ],
      },
      [QueryType.CREATIVE]: {
        [SocraticTechnique.ELENCHUS]: [
          "What conventions are you unconsciously following?",
          "What would happen if you challenged your initial assumptions?",
          "Why do you think this approach is the 'right' one?",
        ],
        [SocraticTechnique.DIALECTIC]: [
          "How might someone with a completely different background approach this?",
          "What would the opposite approach look like?",
          "What tensions exist between different creative directions?",
        ],
        [SocraticTechnique.MAIEUTICS]: [
          "What emotions are you trying to evoke?",
          "What personal experiences might inform this work?",
          "What would make this uniquely yours?",
        ],
        [SocraticTechnique.DEFINITIONAL]: [
          "What exactly do you mean by 'creative' in this context?",
          "How do you define success for this creative project?",
          "What makes something 'original' versus 'derivative'?",
        ],
        [SocraticTechnique.ANALOGICAL]: [
          "What natural phenomenon does your creative process resemble?",
          "If your project were a conversation, what would it be saying?",
          "What architectural structure captures the essence of your idea?",
        ],
        [SocraticTechnique.COUNTERFACTUAL]: [
          "What if you had to create this in a completely different medium?",
          "What if your audience were children versus experts?",
          "What if you only had one day versus unlimited time?",
        ],
      },
      [QueryType.DECISION_MAKING]: {
        [SocraticTechnique.ELENCHUS]: [
          "What values are driving this decision?",
          "What assumptions are you making about the future?",
          "How might you be deceiving yourself about the stakes?",
        ],
        [SocraticTechnique.DIALECTIC]: [
          "What would your biggest critic say about this choice?",
          "How do the pros and cons really compare?",
          "What would someone with different values choose?",
        ],
        [SocraticTechnique.MAIEUTICS]: [
          "What does your intuition tell you?",
          "What would you advise a friend in this situation?",
          "What will you think about this decision in 10 years?",
        ],
        [SocraticTechnique.DEFINITIONAL]: [
          "What exactly constitutes a 'good' decision in this context?",
          "How do you define success for this choice?",
          "What does 'the right thing to do' mean to you?",
        ],
        [SocraticTechnique.ANALOGICAL]: [
          "What similar decisions have you made in the past?",
          "If this were a chess move, what would you be sacrificing?",
          "What navigation decision does this remind you of?",
        ],
        [SocraticTechnique.COUNTERFACTUAL]: [
          "What if the stakes were 10 times higher?",
          "What if you had to make this decision for someone else?",
          "What if you knew you couldn't change your mind later?",
        ],
      },
      [QueryType.PERSONAL_GROWTH]: {
        [SocraticTechnique.ELENCHUS]: [
          "What beliefs about yourself might be limiting you?",
          "How do you know your self-perception is accurate?",
          "What contradictions exist in how you see yourself?",
        ],
        [SocraticTechnique.DIALECTIC]: [
          "How might others see you differently?",
          "What would growth look like from different perspectives?",
          "What tensions exist between who you are and who you want to be?",
        ],
        [SocraticTechnique.MAIEUTICS]: [
          "What do you already know about yourself that you're not acknowledging?",
          "What patterns do you notice in your behavior?",
          "What would the wisest version of yourself say?",
        ],
        [SocraticTechnique.DEFINITIONAL]: [
          "How do you define personal growth?",
          "What does 'success' mean to you personally?",
          "What is the difference between change and growth?",
        ],
        [SocraticTechnique.ANALOGICAL]: [
          "What plant or animal does your growth process resemble?",
          "If your personal development were a journey, what terrain are you crossing?",
          "What skill acquisition process parallels your emotional growth?",
        ],
        [SocraticTechnique.COUNTERFACTUAL]: [
          "What if you had unlimited confidence?",
          "What if you weren't afraid of failure?",
          "What if you knew you only had one year to grow?",
        ],
      },
      [QueryType.LEARNING]: {
        [SocraticTechnique.ELENCHUS]: [
          "What do you think you know about this that might be wrong?",
          "How do you know your sources are reliable?",
          "What gaps exist in your understanding?",
        ],
        [SocraticTechnique.DIALECTIC]: [
          "How would someone from a different field approach this topic?",
          "What competing theories or explanations exist?",
          "Where do experts disagree on this subject?",
        ],
        [SocraticTechnique.MAIEUTICS]: [
          "What connections can you make to things you already know?",
          "What questions does this raise for you?",
          "How might you teach this to someone else?",
        ],
        [SocraticTechnique.DEFINITIONAL]: [
          "What exactly are you trying to learn?",
          "How do you define understanding versus memorization?",
          "What does it mean to truly 'know' something?",
        ],
        [SocraticTechnique.ANALOGICAL]: [
          "What familiar concept is this new information similar to?",
          "If this knowledge were a building, what would be the foundation?",
          "What everyday experience parallels this abstract concept?",
        ],
        [SocraticTechnique.COUNTERFACTUAL]: [
          "What if you had to learn this without any written materials?",
          "What if you had to master this in half the time?",
          "What if you had to use this knowledge to solve a completely different problem?",
        ],
      },
      [QueryType.PROBLEM_SOLVING]: {
        [SocraticTechnique.ELENCHUS]: [
          "How do you know this is the real problem?",
          "What assumptions are you making about the causes?",
          "What evidence challenges your initial diagnosis?",
        ],
        [SocraticTechnique.DIALECTIC]: [
          "What would solving this problem cost you?",
          "How might the solution create new problems?",
          "What would different stakeholders see as the core issue?",
        ],
        [SocraticTechnique.MAIEUTICS]: [
          "What similar problems have you solved before?",
          "What would happen if you approached this completely differently?",
          "What resources do you already have that might help?",
        ],
        [SocraticTechnique.DEFINITIONAL]: [
          "How do you define the problem you're trying to solve?",
          "What would a solution look like?",
          "What's the difference between a symptom and the root cause?",
        ],
        [SocraticTechnique.ANALOGICAL]: [
          "What similar problems exist in other domains?",
          "If this were a medical diagnosis, what would be the symptoms?",
          "What detective work does this problem-solving process resemble?",
        ],
        [SocraticTechnique.COUNTERFACTUAL]: [
          "What if this problem didn't exist?",
          "What if you had unlimited resources to solve it?",
          "What if you had to solve it with the opposite approach?",
        ],
      },
    };

    return questionMap[queryType]?.[technique] || [];
  }

  static generateContextualQuestions(
    query: string,
    technique: SocraticTechnique,
  ): string[] {
    // This would be enhanced with more sophisticated NLP in a real implementation
    const contextualQuestions = [];

    if (
      query.toLowerCase().includes("error") ||
      query.toLowerCase().includes("bug")
    ) {
      contextualQuestions.push(
        "What was the system doing just before this issue occurred?",
      );
      contextualQuestions.push(
        "What changed recently that might have caused this?",
      );
    }

    if (
      query.toLowerCase().includes("choose") ||
      query.toLowerCase().includes("decide")
    ) {
      contextualQuestions.push(
        "What criteria are most important for this decision?",
      );
      contextualQuestions.push(
        "What would happen if you delayed this decision?",
      );
    }

    if (
      query.toLowerCase().includes("stuck") ||
      query.toLowerCase().includes("help")
    ) {
      contextualQuestions.push("What specifically is blocking you right now?");
      contextualQuestions.push("What would the next smallest step be?");
    }

    return contextualQuestions;
  }

  static generateHints(query: string, queryType: QueryType): string[] {
    const hints = [];

    switch (queryType) {
      case QueryType.CODING:
        hints.push(
          "Consider breaking the problem into smaller, testable pieces",
        );
        hints.push("Think about edge cases and error handling");
        hints.push("Look for patterns in similar problems you've solved");
        break;
      case QueryType.CREATIVE:
        hints.push("Try combining seemingly unrelated ideas");
        hints.push("Consider what would happen if you removed all constraints");
        hints.push("Look for inspiration outside your usual domain");
        break;
      case QueryType.DECISION_MAKING:
        hints.push("Consider the reversibility of the decision");
        hints.push("Think about what you'll optimize for in the long term");
        hints.push("Consider the opportunity cost of each option");
        break;
      case QueryType.PERSONAL_GROWTH:
        hints.push("Focus on systems and habits rather than goals");
        hints.push("Consider what you're avoiding or resisting");
        hints.push("Think about what growth looks like for you specifically");
        break;
      case QueryType.LEARNING:
        hints.push("Try to teach the concept to someone else");
        hints.push("Look for real-world applications and examples");
        hints.push("Connect new information to what you already know");
        break;
      case QueryType.PROBLEM_SOLVING:
        hints.push("Consider if you're solving the right problem");
        hints.push("Think about the problem from different perspectives");
        hints.push("Look for the simplest solution that could work");
        break;
    }

    return hints;
  }

  static curateResources(query: string, queryType: QueryType): ResourceLink[] {
    // This would be enhanced with a proper resource database
    const resources: ResourceLink[] = [];

    switch (queryType) {
      case QueryType.CODING:
        resources.push({
          title: "Rubber Duck Debugging",
          url: "https://rubberduckdebugging.com/",
          description:
            "A method of debugging code by explaining it line-by-line to an inanimate object",
          category: "debugging",
        });
        resources.push({
          title: "Problem Solving Techniques",
          url: "https://www.freecodecamp.org/news/how-to-think-like-a-programmer/",
          description:
            "Systematic approaches to breaking down programming problems",
          category: "problem-solving",
        });
        break;
      case QueryType.CREATIVE:
        resources.push({
          title: "Creative Thinking Techniques",
          url: "https://www.interaction-design.org/literature/article/5-stages-in-the-design-thinking-process",
          description:
            "Design thinking methodology for creative problem solving",
          category: "creativity",
        });
        break;
      case QueryType.DECISION_MAKING:
        resources.push({
          title: "Decision Making Frameworks",
          url: "https://fs.blog/decision-making/",
          description:
            "Mental models and frameworks for better decision making",
          category: "decision-making",
        });
        break;
      case QueryType.PERSONAL_GROWTH:
        resources.push({
          title: "Socratic Self-Reflection",
          url: "https://www.philosophy.org/socratic-method/",
          description: "Using the Socratic method for personal development",
          category: "self-improvement",
        });
        break;
      case QueryType.LEARNING:
        resources.push({
          title: "Learning How to Learn",
          url: "https://www.coursera.org/learn/learning-how-to-learn",
          description: "Evidence-based techniques for effective learning",
          category: "learning",
        });
        break;
      case QueryType.PROBLEM_SOLVING:
        resources.push({
          title: "Problem Solving Strategies",
          url: "https://www.khanacademy.org/computing/computer-programming/programming/intro-to-programming/a/problem-solving-strategies",
          description: "Systematic approaches to problem solving",
          category: "problem-solving",
        });
        break;
    }

    return resources;
  }

  static createExplorationPaths(queryType: QueryType): ExplorationPath[] {
    const paths: ExplorationPath[] = [];

    switch (queryType) {
      case QueryType.CODING:
        paths.push({
          id: "debug-approach",
          title: "Systematic Debugging",
          description:
            "Learn to debug by understanding the problem systematically",
          questions: [
            "What did you expect to happen?",
            "What actually happened?",
            "What's the minimal example that reproduces this?",
          ],
          resources: [
            {
              title: "Debugging Techniques",
              url: "https://stackoverflow.com/help/debugging",
              description: "Stack Overflow's guide to debugging",
              category: "debugging",
            },
          ],
        });
        break;
      case QueryType.CREATIVE:
        paths.push({
          id: "creative-constraints",
          title: "Creative Constraints",
          description: "Explore how limitations can boost creativity",
          questions: [
            "What would you create if you had unlimited resources?",
            "What would you create if you had almost no resources?",
            "Which scenario sparks more interesting ideas?",
          ],
          resources: [
            {
              title: "The Power of Constraints",
              url: "https://www.fastcompany.com/90320616/the-creative-power-of-constraints",
              description: "How constraints can enhance creativity",
              category: "creativity",
            },
          ],
        });
        break;
    }

    return paths;
  }
}

/**
 * Handler for listing available resources (exploration paths and techniques)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];

  // Add Socratic techniques as resources
  for (const technique of Object.values(SocraticTechnique)) {
    resources.push({
      uri: `socratic://technique/${technique}`,
      mimeType: "text/plain",
      name: `Socratic Technique: ${
        technique.charAt(0).toUpperCase() + technique.slice(1)
      }`,
      description: `Guide for using the ${technique} technique in inquiry`,
    });
  }

  // Add exploration paths
  for (const queryType of Object.values(QueryType)) {
    const paths = SocraticEngine.createExplorationPaths(queryType);
    for (const path of paths) {
      resources.push({
        uri: `exploration://path/${path.id}`,
        mimeType: "application/json",
        name: path.title,
        description: path.description,
      });
    }
  }

  return { resources };
});

/**
 * Handler for reading resource contents
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);

  if (url.protocol === "socratic:") {
    const technique = url.pathname.replace("/technique/", "");
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "text/plain",
          text: `Socratic Technique: ${technique}\n\nThis technique involves guided questioning to help users discover insights on their own rather than providing direct answers.`,
        },
      ],
    };
  }

  if (url.protocol === "exploration:") {
    const pathId = url.pathname.replace("/path/", "");
    // Find the exploration path
    const allPaths = Object.values(QueryType).flatMap((qt) =>
      SocraticEngine.createExplorationPaths(qt),
    );
    const path = allPaths.find((p) => p.id === pathId);

    if (!path) {
      throw new Error(`Exploration path ${pathId} not found`);
    }

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(path, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource protocol: ${url.protocol}`);
});

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "socratic_inquiry",
        description:
          "Guide users through Socratic questioning based on their query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user's question or problem statement",
            },
            queryType: {
              type: "string",
              enum: Object.values(QueryType),
              description:
                "The type of query (coding, creative, decision_making, etc.)",
            },
            technique: {
              type: "string",
              enum: Object.values(SocraticTechnique),
              description: "The Socratic technique to use",
            },
          },
          required: ["query", "queryType", "technique"],
        },
      },
      {
        name: "explore_paths",
        description: "Show available exploration paths for a given query type",
        inputSchema: {
          type: "object",
          properties: {
            queryType: {
              type: "string",
              enum: Object.values(QueryType),
              description: "The type of query to explore",
            },
          },
          required: ["queryType"],
        },
      },
      {
        name: "explain_approach",
        description:
          "Explain the Socratic approach and why direct answers aren't provided",
        inputSchema: {
          type: "object",
          properties: {
            context: {
              type: "string",
              description:
                "Optional context about what the user is trying to understand",
            },
          },
        },
      },
    ],
  };
});

/**
 * Handler for tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "socratic_inquiry": {
      const query = String(request.params.arguments?.query || "");
      const queryType = String(
        request.params.arguments?.queryType || QueryType.LEARNING,
      ) as QueryType;
      const technique = String(
        request.params.arguments?.technique || SocraticTechnique.ELENCHUS,
      ) as SocraticTechnique;

      const questions = SocraticEngine.generateQuestions(
        query,
        queryType,
        technique,
      );
      const hints = SocraticEngine.generateHints(query, queryType);
      const resources = SocraticEngine.curateResources(query, queryType);

      let response = `🤔 **Socratic Inquiry** (using ${technique} technique)\n\n`;
      response += `**Questions to consider:**\n`;
      questions.forEach((q, i) => {
        response += `${i + 1}. ${q}\n`;
      });

      response += `\n**Hints to guide your thinking:**\n`;
      hints.forEach((hint, i) => {
        response += `💡 ${hint}\n`;
      });

      response += `\n**Resources to explore:**\n`;
      resources.forEach((resource, i) => {
        response += `📚 [${resource.title}](${resource.url}) - ${resource.description}\n`;
      });

      response += `\n**Remember:** The goal is to help you think through this yourself. Take time to reflect on these questions before seeking more guidance.`;

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }

    case "explore_paths": {
      const queryType = String(
        request.params.arguments?.queryType || QueryType.LEARNING,
      ) as QueryType;
      const paths = SocraticEngine.createExplorationPaths(queryType);

      let response = `🗺️ **Exploration Paths for ${queryType.replace(
        "_",
        " ",
      )}**\n\n`;

      if (paths.length === 0) {
        response +=
          "No specific exploration paths available for this query type yet, but you can still use the socratic_inquiry tool with any of the available techniques.";
      } else {
        paths.forEach((path, i) => {
          response += `**${i + 1}. ${path.title}**\n`;
          response += `${path.description}\n\n`;
          response += `Key questions:\n`;
          path.questions.forEach((q) => {
            response += `• ${q}\n`;
          });
          response += `\n`;
        });
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }

    case "explain_approach": {
      const context = String(request.params.arguments?.context || "");

      let response = `🎯 **About the Mukti Approach**\n\n`;
      response += `**"Mukti" means "liberation" in Hindi** - specifically, liberation from over-dependence on AI for thinking.\n\n`;
      response += `**Why we don't give direct answers:**\n`;
      response += `• Direct answers can create cognitive debt and dependency\n`;
      response += `• Questions help you develop critical thinking skills\n`;
      response += `• The process of inquiry is often more valuable than the answer\n`;
      response += `• You retain knowledge better when you discover it yourself\n\n`;
      response += `**What we provide instead:**\n`;
      response += `• Thought-provoking questions using the Socratic method\n`;
      response += `• Hints and guidance to help you think through problems\n`;
      response += `• Curated resources and documentation links\n`;
      response += `• Multiple exploration paths you can choose from\n\n`;
      response += `**The goal:** Help you become a stronger, more independent thinker while still benefiting from AI assistance.`;

      if (context) {
        response += `\n\n**For your specific context:** ${context}\n`;
        response += `This approach will help you build deeper understanding and problem-solving skills that will serve you well beyond this immediate question.`;
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

/**
 * Handler for listing available prompts
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "socratic_elenchus",
        description:
          "Apply the elenchus (cross-examination) technique to reveal contradictions and assumptions",
      },
      {
        name: "socratic_dialectic",
        description:
          "Use dialectical questioning to explore opposing viewpoints and tensions",
      },
      {
        name: "socratic_maieutics",
        description:
          "Apply maieutic questioning to help 'birth' ideas from existing knowledge",
      },
      {
        name: "guided_reflection",
        description:
          "Provide a framework for systematic self-reflection and inquiry",
      },
    ],
  };
});

/**
 * Handler for prompt execution
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const promptName = request.params.name;

  const prompts = {
    socratic_elenchus: {
      role: "system",
      content: `You are applying the Socratic technique of elenchus (cross-examination). Your goal is to reveal contradictions, challenge assumptions, and help the user examine their beliefs more deeply.

Guidelines:
- Ask questions that reveal hidden assumptions
- Point out potential contradictions in reasoning
- Challenge the user to provide evidence for their claims
- Help them see gaps in their logic
- Never provide direct answers - only guide through questioning
- Be respectful but intellectually rigorous

Remember: The goal is liberation of thought, not winning an argument.`,
    },
    socratic_dialectic: {
      role: "system",
      content: `You are applying the Socratic technique of dialectic. Your goal is to help the user explore different perspectives and understand the tensions between opposing viewpoints.

Guidelines:
- Present alternative viewpoints for consideration
- Help the user see both sides of an issue
- Explore the tensions between different approaches
- Ask questions that reveal trade-offs and compromises
- Guide the user to synthesize different perspectives
- Never provide direct answers - only guide through questioning

Remember: Truth often emerges through the clash of ideas.`,
    },
    socratic_maieutics: {
      role: "system",
      content: `You are applying the Socratic technique of maieutics (midwifery). Your goal is to help the user "give birth" to ideas they already possess but haven't fully realized.

Guidelines:
- Help the user draw connections to their existing knowledge
- Ask questions that help them discover patterns they already know
- Guide them to insights they're on the verge of reaching
- Build on what they already understand
- Help them trust their own thinking process
- Never provide direct answers - only guide through questioning

Remember: The user already has the seeds of understanding within them.`,
    },
    guided_reflection: {
      role: "system",
      content: `You are providing a framework for systematic self-reflection and inquiry. Your goal is to help the user develop a structured approach to examining their own thoughts and decisions.

Guidelines:
- Provide a clear structure for self-examination
- Ask questions that promote deep reflection
- Help the user identify patterns in their thinking
- Guide them to examine their motivations and values
- Encourage honest self-assessment
- Never provide direct answers - only guide through questioning

Remember: The most important conversations are the ones we have with ourselves.`,
    },
  };

  const prompt = prompts[promptName as keyof typeof prompts];
  if (!prompt) {
    throw new Error(`Unknown prompt: ${promptName}`);
  }

  return {
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: prompt.content,
        },
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "I'm ready to engage in Socratic dialogue. Please begin with your questioning approach.",
        },
      },
    ],
  };
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Mukti MCP Server error:", error);
  process.exit(1);
});
