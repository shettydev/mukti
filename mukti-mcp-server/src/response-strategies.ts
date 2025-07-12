/**
 * Response Strategies for the Mukti MCP Server
 *
 * This module provides sophisticated response strategies for different query types
 * and contexts, implementing the Socratic method with tailored approaches for
 * coding, creative work, decision-making, personal growth, learning, and problem-solving.
 *
 * @todo These response strategies are currently under development and will be completed in future releases.
 */

import { QueryType, SocraticTechnique, ResourceLink } from "./types.js";

/**
 * Response strategy configuration for different contexts
 */
export interface ResponseStrategy {
  primaryTechnique: SocraticTechnique;
  secondaryTechniques: SocraticTechnique[];
  contextualHints: string[];
  followUpQuestions: string[];
  avoidancePatterns: string[];
  encouragementPhrases: string[];
}

/**
 * Context analysis for better response strategy selection
 */
export interface QueryContext {
  complexity: "low" | "medium" | "high";
  emotionalState:
    | "frustrated"
    | "curious"
    | "confident"
    | "confused"
    | "neutral";
  timeConstraint: "urgent" | "relaxed" | "unknown";
  priorKnowledge: "beginner" | "intermediate" | "advanced" | "unknown";
  stuckIndicators: string[];
}

/**
 * Enhanced response with strategic guidance
 */
export interface StrategicResponse {
  questions: string[];
  hints: string[];
  resources: ResourceLink[];
  strategy: ResponseStrategy;
  context: QueryContext;
  nextSteps: string[];
  alternativePaths: string[];
  encouragement: string;
}

/**
 * Response strategy factory for different query types and contexts
 */
export class ResponseStrategyFactory {
  /**
   * Generate a strategic response based on query type and context
   */
  static generateStrategicResponse(
    query: string,
    queryType: QueryType,
    preferredTechnique?: SocraticTechnique,
  ): StrategicResponse {
    const context = this.analyzeQueryContext(query);
    const strategy = this.selectResponseStrategy(
      queryType,
      context,
      preferredTechnique,
    );

    return {
      questions: this.generateStrategicQuestions(
        query,
        queryType,
        strategy,
        context,
      ),
      hints: this.generateContextualHints(query, queryType, context),
      resources: this.curateContextualResources(query, queryType, context),
      strategy,
      context,
      nextSteps: this.generateNextSteps(queryType, context),
      alternativePaths: this.generateAlternativePaths(queryType, context),
      encouragement: this.generateEncouragement(context, strategy),
    };
  }

  /**
   * Analyze the query context for better response strategy selection
   */
  private static analyzeQueryContext(query: string): QueryContext {
    const lowerQuery = query.toLowerCase();
    const stuckIndicators = [];

    // Emotional state analysis
    let emotionalState: QueryContext["emotionalState"] = "neutral";
    if (
      lowerQuery.includes("frustrated") ||
      lowerQuery.includes("stuck") ||
      lowerQuery.includes("confused")
    ) {
      emotionalState = "frustrated";
      stuckIndicators.push("emotional_frustration");
    } else if (
      lowerQuery.includes("curious") ||
      lowerQuery.includes("wonder") ||
      lowerQuery.includes("explore")
    ) {
      emotionalState = "curious";
    } else if (
      lowerQuery.includes("think") ||
      lowerQuery.includes("believe") ||
      lowerQuery.includes("sure")
    ) {
      emotionalState = "confident";
    } else if (
      lowerQuery.includes("don't understand") ||
      lowerQuery.includes("unclear") ||
      lowerQuery.includes("confusing")
    ) {
      emotionalState = "confused";
      stuckIndicators.push("conceptual_confusion");
    }

    // Complexity analysis
    let complexity: QueryContext["complexity"] = "medium";
    const complexityIndicators = [
      "architecture",
      "design",
      "system",
      "advanced",
      "complex",
      "sophisticated",
    ];
    const simpleIndicators = ["simple", "basic", "easy", "quick", "beginner"];

    if (
      complexityIndicators.some((indicator) => lowerQuery.includes(indicator))
    ) {
      complexity = "high";
    } else if (
      simpleIndicators.some((indicator) => lowerQuery.includes(indicator))
    ) {
      complexity = "low";
    }

    // Time constraint analysis
    let timeConstraint: QueryContext["timeConstraint"] = "unknown";
    if (
      lowerQuery.includes("urgent") ||
      lowerQuery.includes("asap") ||
      lowerQuery.includes("quickly")
    ) {
      timeConstraint = "urgent";
    } else if (
      lowerQuery.includes("explore") ||
      lowerQuery.includes("learn") ||
      lowerQuery.includes("understand")
    ) {
      timeConstraint = "relaxed";
    }

    // Prior knowledge analysis
    let priorKnowledge: QueryContext["priorKnowledge"] = "unknown";
    if (
      lowerQuery.includes("beginner") ||
      lowerQuery.includes("new to") ||
      lowerQuery.includes("never done")
    ) {
      priorKnowledge = "beginner";
    } else if (
      lowerQuery.includes("experienced") ||
      lowerQuery.includes("familiar") ||
      lowerQuery.includes("worked with")
    ) {
      priorKnowledge = "intermediate";
    } else if (
      lowerQuery.includes("expert") ||
      lowerQuery.includes("advanced") ||
      lowerQuery.includes("deep")
    ) {
      priorKnowledge = "advanced";
    }

    // Additional stuck indicators
    if (
      lowerQuery.includes("not working") ||
      lowerQuery.includes("broken") ||
      lowerQuery.includes("error")
    ) {
      stuckIndicators.push("technical_issue");
    }
    if (
      lowerQuery.includes("don't know") ||
      lowerQuery.includes("no idea") ||
      lowerQuery.includes("clueless")
    ) {
      stuckIndicators.push("knowledge_gap");
    }

    return {
      complexity,
      emotionalState,
      timeConstraint,
      priorKnowledge,
      stuckIndicators,
    };
  }

  /**
   * Select the most appropriate response strategy based on query type and context
   */
  private static selectResponseStrategy(
    queryType: QueryType,
    context: QueryContext,
    preferredTechnique?: SocraticTechnique,
  ): ResponseStrategy {
    const baseStrategies = {
      [QueryType.CODING]: {
        primaryTechnique: SocraticTechnique.ELENCHUS,
        secondaryTechniques: [
          SocraticTechnique.DIALECTIC,
          SocraticTechnique.COUNTERFACTUAL,
        ],
        contextualHints: [
          "Break the problem down into smaller, testable components",
          "Consider what assumptions you're making about the system",
          "Think about edge cases and error conditions",
        ],
        followUpQuestions: [
          "What would happen if you simplified this to its core essence?",
          "What debugging steps have you already tried?",
          "What would you do if you had to explain this to a rubber duck?",
        ],
        avoidancePatterns: [
          "Here's the exact code to copy...",
          "The answer is...",
          "Just do this...",
        ],
        encouragementPhrases: [
          "You're thinking like a true problem-solver",
          "That's exactly the kind of systematic approach that works",
          "You're building valuable debugging skills",
        ],
      },
      [QueryType.CREATIVE]: {
        primaryTechnique: SocraticTechnique.MAIEUTICS,
        secondaryTechniques: [
          SocraticTechnique.ANALOGICAL,
          SocraticTechnique.COUNTERFACTUAL,
        ],
        contextualHints: [
          "Consider combining seemingly unrelated concepts",
          "Think about what constraints might actually be liberating",
          "Explore what emotions or experiences you want to evoke",
        ],
        followUpQuestions: [
          "What would make this uniquely yours?",
          "What would happen if you challenged your first instinct?",
          "What story are you trying to tell?",
        ],
        avoidancePatterns: [
          "You should create...",
          "The best approach is...",
          "Copy this style...",
        ],
        encouragementPhrases: [
          "Your creative instincts are guiding you well",
          "That's an interesting direction to explore",
          "You're discovering your unique voice",
        ],
      },
      [QueryType.DECISION_MAKING]: {
        primaryTechnique: SocraticTechnique.DIALECTIC,
        secondaryTechniques: [
          SocraticTechnique.ELENCHUS,
          SocraticTechnique.COUNTERFACTUAL,
        ],
        contextualHints: [
          "Consider the reversibility of this decision",
          "Think about what you're optimizing for in the long term",
          "Examine what values are driving your choice",
        ],
        followUpQuestions: [
          "What would your future self think about this decision?",
          "What would you advise a friend in this situation?",
          "What are you afraid might happen if you choose differently?",
        ],
        avoidancePatterns: [
          "You should definitely...",
          "The right choice is...",
          "Here's what I would do...",
        ],
        encouragementPhrases: [
          "You're thinking through this thoughtfully",
          "That's excellent reflection on your values",
          "You're building strong decision-making skills",
        ],
      },
      [QueryType.PERSONAL_GROWTH]: {
        primaryTechnique: SocraticTechnique.MAIEUTICS,
        secondaryTechniques: [
          SocraticTechnique.ELENCHUS,
          SocraticTechnique.ANALOGICAL,
        ],
        contextualHints: [
          "Focus on systems and habits rather than just outcomes",
          "Consider what you might be avoiding or resisting",
          "Think about what growth means to you specifically",
        ],
        followUpQuestions: [
          "What patterns do you notice in your own behavior?",
          "What would the wisest version of yourself say?",
          "What would growth look like if fear wasn't a factor?",
        ],
        avoidancePatterns: [
          "You need to...",
          "The solution is...",
          "Here's how to fix yourself...",
        ],
        encouragementPhrases: [
          "You're showing real self-awareness",
          "That's a powerful insight about yourself",
          "You're on a meaningful journey of growth",
        ],
      },
      [QueryType.LEARNING]: {
        primaryTechnique: SocraticTechnique.MAIEUTICS,
        secondaryTechniques: [
          SocraticTechnique.DIALECTIC,
          SocraticTechnique.ANALOGICAL,
        ],
        contextualHints: [
          "Try to connect new information to what you already know",
          "Consider teaching the concept to someone else",
          "Look for real-world applications and examples",
        ],
        followUpQuestions: [
          "What connections can you make to things you already understand?",
          "What questions does this raise for you?",
          "How might you explain this to someone else?",
        ],
        avoidancePatterns: [
          "The answer is...",
          "You need to memorize...",
          "Here's what it means...",
        ],
        encouragementPhrases: [
          "You're building deep understanding",
          "That's exactly the kind of question that leads to insight",
          "You're developing strong learning skills",
        ],
      },
      [QueryType.PROBLEM_SOLVING]: {
        primaryTechnique: SocraticTechnique.ELENCHUS,
        secondaryTechniques: [
          SocraticTechnique.DIALECTIC,
          SocraticTechnique.ANALOGICAL,
        ],
        contextualHints: [
          "Consider whether you're solving the right problem",
          "Think about the problem from different perspectives",
          "Look for the simplest solution that could work",
        ],
        followUpQuestions: [
          "How do you know this is the real problem?",
          "What would happen if you approached this completely differently?",
          "What similar problems have you solved before?",
        ],
        avoidancePatterns: [
          "The solution is...",
          "You should try...",
          "Here's how to fix it...",
        ],
        encouragementPhrases: [
          "You're thinking systematically about this",
          "That's a thoughtful approach to problem-solving",
          "You're developing valuable analytical skills",
        ],
      },
    };

    const baseStrategy = baseStrategies[queryType];

    // Adjust strategy based on context
    if (preferredTechnique) {
      baseStrategy.primaryTechnique = preferredTechnique;
    }

    // Context-specific adjustments
    if (context.emotionalState === "frustrated") {
      baseStrategy.encouragementPhrases = [
        "It's completely normal to feel stuck sometimes",
        "You're working through this methodically",
        "Each question brings you closer to understanding",
        ...baseStrategy.encouragementPhrases,
      ];
    }

    if (context.timeConstraint === "urgent") {
      baseStrategy.followUpQuestions = [
        "What's the simplest approach that could work?",
        "What's the most critical piece to figure out first?",
        ...baseStrategy.followUpQuestions.slice(0, 2),
      ];
    }

    return baseStrategy;
  }

  /**
   * Generate strategic questions based on strategy and context
   */
  private static generateStrategicQuestions(
    query: string,
    queryType: QueryType,
    strategy: ResponseStrategy,
    context: QueryContext,
  ): string[] {
    const questions = [];

    // Add strategy-specific questions
    questions.push(...strategy.followUpQuestions);

    // Add context-specific questions
    if (context.stuckIndicators.includes("technical_issue")) {
      questions.push(
        "What was the last thing that worked before this issue appeared?",
      );
      questions.push(
        "What would happen if you started with a minimal working example?",
      );
    }

    if (context.stuckIndicators.includes("knowledge_gap")) {
      questions.push("What do you already know that might be related to this?");
      questions.push("What would be the smallest step forward you could take?");
    }

    if (context.priorKnowledge === "beginner") {
      questions.push(
        "What foundational concepts might be important to understand first?",
      );
      questions.push("What would you want to learn if you had unlimited time?");
    }

    return questions.slice(0, 5); // Limit to 5 questions to avoid overwhelming
  }

  /**
   * Generate contextual hints based on query type and context
   */
  private static generateContextualHints(
    query: string,
    queryType: QueryType,
    context: QueryContext,
  ): string[] {
    const hints = [];

    // Add base hints from strategy
    const strategy = this.selectResponseStrategy(queryType, context);
    hints.push(...strategy.contextualHints);

    // Add context-specific hints
    if (context.complexity === "high") {
      hints.push("Consider breaking this into smaller, more manageable pieces");
    }

    if (context.emotionalState === "frustrated") {
      hints.push("Take a step back and approach this with fresh perspective");
      hints.push(
        "Sometimes the best insights come when we're not forcing them",
      );
    }

    if (context.timeConstraint === "urgent") {
      hints.push("Focus on the minimum viable solution first");
      hints.push("What's the 80/20 approach here?");
    }

    return hints.slice(0, 4); // Limit to 4 hints
  }

  /**
   * Curate contextual resources based on query type and context
   */
  private static curateContextualResources(
    query: string,
    queryType: QueryType,
    context: QueryContext,
  ): ResourceLink[] {
    const resources: ResourceLink[] = [];

    // Add base resources for query type
    switch (queryType) {
      case QueryType.CODING:
        resources.push({
          title: "Rubber Duck Debugging",
          url: "https://rubberduckdebugging.com/",
          description:
            "A method of debugging code by explaining it line-by-line",
          category: "debugging",
        });

        if (context.priorKnowledge === "beginner") {
          resources.push({
            title: "Problem-Solving for Programmers",
            url: "https://www.freecodecamp.org/news/how-to-think-like-a-programmer/",
            description: "Learn systematic approaches to programming problems",
            category: "learning",
          });
        }
        break;

      case QueryType.CREATIVE:
        resources.push({
          title: "Creative Constraints",
          url: "https://www.fastcompany.com/90320616/the-creative-power-of-constraints",
          description: "How limitations can actually boost creativity",
          category: "creativity",
        });
        break;

      case QueryType.DECISION_MAKING:
        resources.push({
          title: "Decision-Making Frameworks",
          url: "https://fs.blog/decision-making/",
          description: "Mental models for better decision making",
          category: "decision-making",
        });
        break;

      case QueryType.PERSONAL_GROWTH:
        resources.push({
          title: "Socratic Self-Reflection",
          url: "https://www.philosophy.org/socratic-method/",
          description: "Using philosophical inquiry for personal development",
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
          title: "Problem-Solving Strategies",
          url: "https://www.khanacademy.org/computing/computer-programming/programming/intro-to-programming/a/problem-solving-strategies",
          description: "Systematic approaches to problem solving",
          category: "problem-solving",
        });
        break;
    }

    return resources;
  }

  /**
   * Generate next steps based on query type and context
   */
  private static generateNextSteps(
    queryType: QueryType,
    context: QueryContext,
  ): string[] {
    const steps = [];

    if (context.stuckIndicators.length > 0) {
      steps.push("Take a few minutes to reflect on the questions above");
      steps.push("Try one small experiment or test");
    }

    steps.push("Consider discussing this with someone else");
    steps.push("Document your thought process as you work through this");

    if (context.timeConstraint === "urgent") {
      steps.push("Focus on the most critical aspect first");
    } else {
      steps.push("Explore the resources provided for deeper understanding");
    }

    return steps;
  }

  /**
   * Generate alternative exploration paths
   */
  private static generateAlternativePaths(
    queryType: QueryType,
    context: QueryContext,
  ): string[] {
    const paths = [];

    switch (queryType) {
      case QueryType.CODING:
        paths.push("Approach this as a debugging exercise");
        paths.push("Think about it as a design problem");
        paths.push("Consider it from a testing perspective");
        break;
      case QueryType.CREATIVE:
        paths.push("Explore through constraints and limitations");
        paths.push("Approach through emotional resonance");
        paths.push("Consider the audience's perspective");
        break;
      case QueryType.DECISION_MAKING:
        paths.push("Analyze through different value systems");
        paths.push("Consider long-term vs. short-term implications");
        paths.push("Evaluate through risk assessment");
        break;
    }

    return paths;
  }

  /**
   * Generate encouragement based on context and strategy
   */
  private static generateEncouragement(
    context: QueryContext,
    strategy: ResponseStrategy,
  ): string {
    const encouragements = strategy.encouragementPhrases;

    if (context.emotionalState === "frustrated") {
      return (
        "Remember, feeling stuck is part of the learning process. " +
        encouragements[Math.floor(Math.random() * encouragements.length)]
      );
    }

    if (context.emotionalState === "curious") {
      return (
        "Your curiosity is your greatest asset here. " +
        encouragements[Math.floor(Math.random() * encouragements.length)]
      );
    }

    return encouragements[Math.floor(Math.random() * encouragements.length)];
  }
}
