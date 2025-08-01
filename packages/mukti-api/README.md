# Mukti API

> **"Mukti" means "liberation" in Hindi** - specifically, liberation from over-dependence on AI for thinking.

The backend API for Mukti's **Thinking Workspace** - a revolutionary approach to problem-solving that guides users through structured inquiry rather than providing direct answers.

## Philosophy

The Mukti API isn't just another REST service. It's the backbone of a **cognitive liberation platform** that transforms how people interact with AI assistance. Instead of building endpoints that deliver solutions, we build pathways that cultivate thinking.

### The Thinking Workspace Paradigm

Traditional APIs serve data. Mukti API serves **guided discovery experiences**:

- **Problem Definition Canvas**: Break down challenges into explorable components
- **Research Orchestration**: Surface resources that spark insight, not dependency
- **Progress Archaeology**: Track the journey of thought, not just outcomes
- **Reflection Amplification**: Document and analyze thinking patterns

### Why This Matters

Every endpoint in this API is designed around a core principle: **the process of inquiry is more valuable than the answer itself**. We're not building a knowledge delivery system - we're building a **thinking enhancement platform**.

## Current Status

🚧 **Under Development**: This API is currently in early development. The core NestJS foundation is established, with Socratic methodology features planned for implementation.

**What's Implemented**: Basic NestJS template and project structure
**What's Coming**: Full thinking workspace functionality aligned with Socratic principles

## Architecture Vision

### Core Entities (Planned)

#### ThinkingSession

A complete journey of guided inquiry

- Session context and metadata
- Progress tracking through inquiry stages
- Connection points between related explorations

#### ProblemCanvas

Structured problem decomposition

- Problem statements and constraints
- Assumption mapping
- Stakeholder perspectives
- Success criteria definition

#### InquiryPath

Dynamic questioning sequences

- Socratic technique application
- Contextual question generation
- User response analysis
- Path adaptation based on discovery

#### ResourceCuration

Intelligent resource discovery

- Context-aware resource surfacing
- Learning path construction
- External API integration for documentation
- Community knowledge aggregation

#### ReflectionLog

Thought process documentation

- Decision point recording
- Pattern recognition
- Growth tracking
- Insight consolidation

## API Design Principles

### 1. Questions Over Answers

```javascript
// Traditional API Response
{
  "solution": "Use React.memo() to prevent re-renders",
  "implementation": "..."
}

// Mukti API Response
{
  "inquiry": {
    "technique": "elenchus",
    "questions": [
      "What specific re-rendering behavior are you observing?",
      "Have you measured the performance impact?",
      "What assumptions are you making about the root cause?"
    ],
    "exploration_paths": ["performance_profiling", "component_analysis", "state_flow_mapping"],
    "resources": [
      {
        "type": "documentation",
        "title": "React Performance Profiling Guide",
        "url": "...",
        "context": "Before optimizing, measure"
      }
    ]
  }
}
```

### 2. Journey Over Destination

```javascript
// Traditional: GET /solutions/auth-implementation
// Mukti: POST /thinking-sessions/begin

{
  "context": {
    "domain": "authentication",
    "complexity": "medium",
    "constraints": ["security-first", "user-experience"]
  },
  "inquiry_preference": "dialectic"
}
```

### 3. Growth Over Dependency

Every API interaction is designed to strengthen the user's thinking muscles, not replace them.

## Planned Endpoints

### Thinking Session Management

```
POST   /thinking-sessions/begin          # Start a new inquiry journey
GET    /thinking-sessions/{id}           # Retrieve session state
PATCH  /thinking-sessions/{id}/progress  # Update with discoveries
POST   /thinking-sessions/{id}/reflect   # Add reflection points
```

### Problem Canvas Operations

```
POST   /problem-canvas/define            # Structure a problem
GET    /problem-canvas/{id}/explore      # Get exploration suggestions
PATCH  /problem-canvas/{id}/assumptions  # Update assumption mapping
```

### Socratic Inquiry Engine

```
POST   /inquiry/question                 # Generate contextual questions
POST   /inquiry/techniques/{type}        # Apply specific Socratic technique
GET    /inquiry/paths                    # Discover exploration paths
```

### Resource Curation

```
GET    /resources/discover               # Context-aware resource surfacing
POST   /resources/curate                # Build learning paths
GET    /resources/validate              # Verify resource relevance
```

### Reflection & Growth

```
POST   /reflections/capture             # Document insights
GET    /reflections/patterns            # Identify thinking patterns
GET    /reflections/growth-trajectory   # Track cognitive development
```

## Example: Thinking Workspace Flow

### 1. Problem Definition

```javascript
POST /problem-canvas/define
{
  "initial_statement": "My React app is slow",
  "context": {
    "domain": "frontend_performance",
    "urgency": "medium",
    "prior_attempts": []
  }
}

// Response: Guided problem decomposition
{
  "canvas_id": "canvas_123",
  "decomposition_questions": [
    "What specific user actions trigger the slowness?",
    "How are you measuring 'slow'?",
    "What performance expectations do you have?"
  ],
  "assumption_prompts": [
    "I assume the slowness is due to...",
    "I believe users expect...",
    "I think the bottleneck is..."
  ]
}
```

### 2. Guided Inquiry

```javascript
POST /inquiry/question
{
  "canvas_id": "canvas_123",
  "current_understanding": "User reports slow loading on product list page",
  "technique": "maieutics"
}

// Response: Questions that birth insight
{
  "questions": [
    "What do you already know about React rendering behavior?",
    "What patterns have you seen in other performance issues?",
    "How does your component structure relate to the slowness?"
  ],
  "next_steps": ["performance_profiling", "component_analysis"],
  "resources": [...]
}
```

### 3. Resource Discovery

```javascript
GET /resources/discover?context=react_performance&level=intermediate

// Response: Curated learning resources
{
  "primary_resources": [
    {
      "type": "interactive_guide",
      "title": "React DevTools Profiler Walkthrough",
      "why_relevant": "Measure before optimizing",
      "cognitive_load": "medium"
    }
  ],
  "exploration_branches": [
    "react_profiling_tools",
    "component_optimization_patterns",
    "bundle_analysis_techniques"
  ]
}
```

## Project Setup

### Prerequisites

- Node.js 18 or higher
- Bun runtime (preferred) or npm

### Installation

```bash
cd mukti/packages/mukti-api
bun install
```

### Development

```bash
# Development server
bun run start:dev

# Production build
bun run build
bun run start:prod
```

### Testing

```bash
# Unit tests
bun run test

# Integration tests
bun run test:e2e

# Coverage analysis
bun run test:cov
```

## Contributing to Liberation

We welcome contributions that align with Mukti's philosophy:

### Code Contributions

- **Enhance Socratic questioning algorithms**
- **Improve resource curation intelligence**
- **Expand thinking session analytics**
- **Build domain-specific inquiry modules**

### Philosophy Contributions

- **Refine questioning techniques**
- **Develop new inquiry methodologies**
- **Create cognitive assessment frameworks**
- **Design anti-dependency patterns**

### Guidelines

1. **No direct answer endpoints** - every response should guide inquiry
2. **Question quality over quantity** - thoughtful prompts over information dumps
3. **Growth measurement** - track cognitive development, not just task completion
4. **Transparent reasoning** - explain why we ask what we ask

## Roadmap

### Phase 1: Foundation (Current)

- ✅ NestJS setup and basic structure
- 🚧 Core entity models
- 🚧 Socratic inquiry engine
- 🚧 Basic thinking session management

### Phase 2: Intelligence

- 🔄 Advanced question generation
- 🔄 Context-aware resource curation
- 🔄 Progress tracking and analytics
- 🔄 Multi-domain inquiry support

### Phase 3: Wisdom

- 🔄 Adaptive learning paths
- 🔄 Community knowledge integration
- 🔄 Cognitive pattern recognition
- 🔄 Long-term growth analytics

## Acknowledgments

Inspired by my mentor [Shaik Noorullah](https://github.com/shaiknoorullah) and the philosophical traditions of Socrates, Plato, and the broader Socratic method of inquiry.

Built with NestJS and the conviction that **the best AI doesn't give you answers - it teaches you to find better questions**.

---

_"The only true wisdom is in knowing you know nothing."_ - Socrates

**Remember**: Every line of code in this API should ask "Does this make the user think harder or think less?" The answer determines whether we're building liberation or dependency.
