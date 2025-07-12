# Mukti MCP Server Examples

This document provides detailed examples of how to use the Mukti MCP Server for different types of inquiries.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Coding Examples](#coding-examples)
3. [Creative Examples](#creative-examples)
4. [Decision Making Examples](#decision-making-examples)
5. [Personal Growth Examples](#personal-growth-examples)
6. [Learning Examples](#learning-examples)
7. [Problem Solving Examples](#problem-solving-examples)
8. [Socratic Technique Examples](#socratic-technique-examples)

## Basic Usage

### Starting a Simple Inquiry

```json
{
  "query": "I'm having trouble with my code",
  "query_type": "coding"
}
```

**Response includes:**

- Strategic questions to help you think through the problem
- Hints about debugging approaches
- Links to relevant documentation
- Next steps for systematic problem-solving

### Exploring Available Paths

```json
{
  "query_type": "personal_growth"
}
```

**Shows available exploration paths like:**

- Self-awareness development
- Goal-setting frameworks
- Habit formation strategies
- Emotional intelligence building

## Coding Examples

### 1. Performance Optimization

**Query:**

```json
{
  "query": "My React app is rendering slowly and I don't know why",
  "query_type": "coding",
  "technique": "elenchus"
}
```

**Sample Response:**

- _"What assumptions are you making about where the bottleneck is?"_
- _"Have you measured the actual render times, or are you guessing?"_
- _"What evidence do you have that this is a React-specific issue?"_

**Hints:**

- Consider using React DevTools Profiler
- Check for unnecessary re-renders
- Examine component hierarchy

**Resources:**

- React Performance Documentation
- Web Performance Optimization Guide
- Chrome DevTools Performance Tab

### 2. Architecture Decisions

**Query:**

```json
{
  "query": "Should I use microservices or a monolith for my startup?",
  "query_type": "coding",
  "technique": "dialectic"
}
```

**Sample Response:**

- _"What are the trade-offs between operational complexity and development speed?"_
- _"How might someone argue against your preference?"_
- _"What would change your mind about this decision?"_

**Hints:**

- Consider team size and expertise
- Think about deployment and monitoring complexity
- Evaluate future scaling needs

## Creative Examples

### 1. Writing Block

**Query:**

```json
{
  "query": "I'm stuck on my novel. The characters feel flat and boring.",
  "query_type": "creative",
  "technique": "maieutics"
}
```

**Sample Response:**

- _"What do you already know about creating compelling characters?"_
- _"What real people in your life have the most interesting contradictions?"_
- _"What would happen if you gave your character a secret they're hiding?"_

**Hints:**

- Characters need internal conflicts
- Consider their backstory and motivations
- Think about what they want vs. what they need

### 2. Design Challenge

**Query:**

```json
{
  "query": "My app interface looks cluttered but I don't know what to remove",
  "query_type": "creative",
  "technique": "definitional"
}
```

**Sample Response:**

- _"How do you define 'essential' vs. 'nice to have' in your interface?"_
- _"What does 'user-friendly' mean in the context of your specific users?"_
- _"How would you measure whether something is truly necessary?"_

## Decision Making Examples

### 1. Career Change

**Query:**

```json
{
  "query": "I'm considering leaving my tech job to become a teacher",
  "query_type": "decision_making",
  "technique": "counterfactual"
}
```

**Sample Response:**

- _"What if you had to make this decision with half your current savings?"_
- _"What if you knew you couldn't change back for 5 years?"_
- _"What if someone offered you your dream tech job tomorrow?"_

**Hints:**

- Consider conducting informational interviews
- Think about your long-term values
- Evaluate the financial transition plan

### 2. Business Strategy

**Query:**

```json
{
  "query": "Should we pivot our product or double down on current features?",
  "query_type": "decision_making",
  "technique": "analogical"
}
```

**Sample Response:**

- _"If this were a chess game, what move would you be making?"_
- _"What navigation decision does this remind you of?"_
- _"If you were a gardener, would you be pruning or planting?"_

## Personal Growth Examples

### 1. Overcoming Procrastination

**Query:**

```json
{
  "query": "I keep putting off important tasks and I don't know why",
  "query_type": "personal_growth",
  "technique": "elenchus"
}
```

**Sample Response:**

- _"What beliefs do you hold about your ability to complete difficult tasks?"_
- _"How do you know procrastination is the real problem here?"_
- _"What contradictions do you notice between your goals and your actions?"_

**Hints:**

- Examine the emotional weight of tasks
- Consider breaking large tasks into smaller ones
- Think about what you're avoiding

### 2. Building Confidence

**Query:**

```json
{
  "query": "I want to be more confident in social situations",
  "query_type": "personal_growth",
  "technique": "maieutics"
}
```

**Sample Response:**

- _"What do you already know about times when you felt confident?"_
- _"What patterns do you notice in situations where you feel most comfortable?"_
- _"What would the most confident version of yourself do differently?"_

## Learning Examples

### 1. Learning New Technology

**Query:**

```json
{
  "query": "I'm trying to learn machine learning but it feels overwhelming",
  "query_type": "learning",
  "technique": "definitional"
}
```

**Sample Response:**

- _"How do you define 'learning' machine learning?"_
- _"What does 'overwhelming' mean in terms of specific concepts?"_
- _"How would you know when you've learned enough to be productive?"_

**Hints:**

- Start with fundamental concepts
- Focus on practical applications
- Build projects to reinforce learning

### 2. Skill Development

**Query:**

```json
{
  "query": "I want to improve my public speaking but I'm terrified",
  "query_type": "learning",
  "technique": "counterfactual"
}
```

**Sample Response:**

- _"What if you had to speak to one person versus a hundred?"_
- _"What if you knew the audience was completely on your side?"_
- _"What if you could only improve through practice, not theory?"_

## Socratic Technique Examples

### Elenchus (Cross-examination)

**Best for:** Challenging assumptions, revealing contradictions

**Sample Questions:**

- "What assumptions are you making that might not be true?"
- "How do you know this belief is accurate?"
- "What evidence contradicts your current thinking?"

### Dialectic

**Best for:** Exploring tensions, considering alternatives

**Sample Questions:**

- "What would someone who disagrees with you say?"
- "How might these conflicting ideas both be true?"
- "What synthesis could emerge from these opposing views?"

### Maieutics

**Best for:** Drawing out existing knowledge, building confidence

**Sample Questions:**

- "What do you already know that applies here?"
- "What patterns have you seen in similar situations?"
- "What would your intuition tell you if you trusted it?"

### Definitional

**Best for:** Clarifying concepts, establishing foundations

**Sample Questions:**

- "How do you define success in this context?"
- "What exactly do you mean by [key term]?"
- "What distinguishes this from similar concepts?"

### Analogical

**Best for:** Creating new perspectives, simplifying complex ideas

**Sample Questions:**

- "What does this situation remind you of in nature?"
- "If this were a story, what genre would it be?"
- "What everyday object behaves similarly to this concept?"

### Counterfactual

**Best for:** Exploring possibilities, testing robustness

**Sample Questions:**

- "What if the opposite were true?"
- "What would happen if you removed this constraint?"
- "What if you had to solve this with half the resources?"

## Integration with Claude Desktop

To use these examples with Claude Desktop, add the server to your configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mukti": {
      "command": "npx",
      "args": ["mukti-mcp-server"]
    }
  }
}
```

## Tips for Effective Use

1. **Be specific with your queries** - The more context you provide, the better the questions
2. **Choose appropriate techniques** - Different techniques work better for different types of problems
3. **Embrace the discomfort** - Good questions should make you think, not feel comfortable
4. **Follow the hints** - They're designed to guide you toward insights
5. **Use the resources** - Links are curated to provide deeper understanding

## Common Patterns

### When Stuck

- Use `elenchus` to challenge your assumptions
- Try `counterfactual` to explore alternatives
- Apply `maieutics` to build on what you know

### When Exploring

- Use `dialectic` to see different perspectives
- Try `analogical` to find new connections
- Apply `definitional` to clarify concepts

### When Deciding

- Use `counterfactual` to test scenarios
- Try `dialectic` to weigh options
- Apply `elenchus` to examine motivations
