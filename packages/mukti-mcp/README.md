# Mukti MCP Server

> **"Mukti" means "liberation" in Hindi** - specifically, liberation from over-dependence on AI for thinking.

A Socratic AI assistant that guides users to think for themselves rather than providing direct answers. Built on the Model Context Protocol (MCP) solely as a prototype or proof-of-concept.

Mukti implements the classical Socratic method through guided questioning, resource curation, and transparent educational practices.

## Philosophy

The Mukti MCP Server is designed around a core belief: **the process of inquiry is often more valuable than the answer itself**. Instead of creating cognitive debt through direct answers, the goal is to help users develop critical thinking skills that serve them long-term.

### Why We Don't Give Direct Answers

- **Cognitive Development**: Questions help develop critical thinking skills
- **Knowledge Retention**: You retain information better when you discover it yourself
- **Dependency Prevention**: Direct answers can create over-reliance on AI
- **Deeper Understanding**: The inquiry process builds comprehensive understanding

### What We Provide Instead

- **Thought-provoking questions** using classical Socratic techniques
- **Strategic hints and guidance** to help you think through problems
- **Curated resources** and documentation links
- **Multiple exploration paths** you can choose from
- **Transparent explanations** of our approach and reasoning

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. **Clone or download** the Mukti MCP Server
2. **Install dependencies**:

   ```bash
   cd mukti-mcp-server
   npm install
   ```

3. **Build the project**:

   ```bash
   npm run build
   ```

4. **Start using the server**:

   ```bash
   npm install -g .
   ```

5. **Test the server**:

   ```bash
   npm run inspector
   ```

## Usage

### MCP Integration

The server exposes three main tools for MCP-compatible clients:

#### 1. `socratic_inquiry`

The core tool for guided Socratic questioning.

**Parameters:**

- `query` (required): Your question or problem
- `query_type` (optional): Type of query - coding, creative, decision_making, personal_growth, learning, problem_solving
- `technique` (optional): Socratic technique - elenchus, dialectic, maieutics, definitional, analogical, counterfactual

**Example:**

```json
{
  "query": "I'm stuck on implementing authentication in my web app",
  "query_type": "coding",
  "technique": "elenchus"
}
```

#### 2. `explore_paths`

Discover available exploration paths for different types of inquiries.

**Parameters:**

- `query_type` (required): The type of inquiry you want to explore

**Example:**

```json
{
  "query_type": "personal_growth"
}
```

#### 3. `explain_approach`

Understand the Mukti philosophy and approach.

**Parameters:**

- `context` (optional): Specific context for the explanation

## Socratic Techniques

### 1. **Elenchus (Cross-examination)**

Reveals contradictions and challenges assumptions

- _"What assumptions are you making about this problem?"_
- _"Have you considered what might go wrong with this approach?"_

### 2. **Dialectic**

Explores opposing viewpoints and tensions

- _"What are the trade-offs between different approaches?"_
- _"How might someone argue against your chosen solution?"_

### 3. **Maieutics**

Helps "birth" ideas from existing knowledge.
_Don't worry about the pronunciation, even I can't pronounce it correctly. But if you are still curious: may-YOO-tiks_

- _"What do you already know that might help here?"_
- _"What patterns have you seen in similar problems?"_

### 4. **Definitional**

Clarifies concepts and definitions

- _"How would you define the core problem you're trying to solve?"_
- _"What do you mean when you say this solution is 'correct'?"_

### 5. **Analogical**

Uses analogies and comparisons

- _"What real-world system does this remind you of?"_
- _"If this were a physical machine, what would be broken?"_

### 6. **Counterfactual**

Explores alternative scenarios

- _"What if this code had to run 1000 times slower?"_
- _"What if you couldn't use any external libraries?"_

## Query Types

### Coding

Technical problem-solving, debugging, architecture decisions

- Focuses on assumptions, trade-offs, and systematic thinking
- Provides links to documentation and best practices

### Creative

Artistic projects, writing, design challenges

- Explores conventions, emotions, and unique perspectives
- Encourages personal expression and originality

### Decision Making

Life choices, business decisions, strategic planning

- Examines values, assumptions, and long-term consequences
- Guides systematic evaluation of options

### Personal Growth

Self-reflection, habit formation, emotional intelligence

- Reveals limiting beliefs and behavioral patterns
- Encourages honest self-assessment

### Learning

Educational pursuits, skill development, knowledge acquisition

- Builds on existing knowledge and identifies gaps
- Creates structured learning paths

### Problem Solving

General problem-solving across domains

- Applies systematic analytical approaches
- Encourages creative solution exploration

## Examples

### Coding Example

**Query:** "My React app is slow. How do I optimize it?"

**Response:**

- Questions about current performance metrics
- Inquiry into rendering patterns and state management
- Hints about profiling tools and optimization strategies
- Resources linking to React performance documentation

### Creative Example

**Query:** "I'm writing a story but it feels generic."

**Response:**

- Questions about personal experiences and emotions
- Exploration of unique perspectives and voice
- Hints about character development and conflict
- Resources on creative writing techniques

### Decision Making Example

**Query:** "Should I change careers?"

**Response:**

- Questions about values, motivations, and long-term goals
- Exploration of risk tolerance and financial considerations
- Hints about systematic decision-making frameworks
- Resources on career transition strategies

## Configuration

The server automatically detects query context and adjusts responses based on:

- **Complexity Level**: Low, medium, or high
- **Emotional State**: Frustrated, curious, confident, confused, neutral
- **Time Constraints**: Urgent, relaxed, or unknown
- **Prior Knowledge**: Beginner, intermediate, advanced, or unknown

## Prompts

The server includes four specialized prompts:

1. **`socratic_elenchus`**: Cross-examination technique
2. **`socratic_dialectic`**: Dialectical questioning
3. **`socratic_maieutics`**: Maieutic questioning
4. **`guided_reflection`**: Systematic self-reflection

## Contributing

We welcome contributions that align with the Mukti philosophy:

1. **Maintain the Socratic approach** - no direct answers
2. **Enhance question quality** - make inquiries more thought-provoking
3. **Improve resource curation** - add valuable learning resources
4. **Expand technique variety** - develop new Socratic methods

## Acknowledgments

Built on the Model Context Protocol by Anthropic. Inspired by my mentor [Shaik Noorullah](https://github.com/shaiknoorullah) and the philosophical traditions of Socrates, Plato, and the broader Socratic method of inquiry.

---

_"The only true wisdom is in knowing you know nothing."_ - Socrates
