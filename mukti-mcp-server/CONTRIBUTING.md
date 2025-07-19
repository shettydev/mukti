# Contributing to Mukti MCP Server

Welcome to the Mukti MCP Server project! We're excited that you're interested in contributing to our Socratic learning system. This guide will help you get started with contributing code, documentation, or other improvements.

## 🎯 Project Overview

Mukti is a Model Context Protocol (MCP) server that implements Socratic questioning techniques to help users learn and solve problems through guided inquiry. Instead of providing direct answers, Mukti helps users discover solutions through thoughtful questions and exploration.

### Core Principles

- **Socratic Method**: Guide users to insights through questioning rather than direct answers
- **Adaptive Learning**: Personalize the experience based on user behavior and preferences
- **Educational Value**: Every interaction should promote learning and critical thinking
- **Accessibility**: Make powerful learning tools available to everyone

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **bun**
- **Git**
- **TypeScript** knowledge
- Basic understanding of the Model Context Protocol (MCP)

### Development Setup

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/shettydev/mukti.git
   cd mukti/mukti-mcp-server
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Project**

   ```bash
   npm run build
   ```

4. **Run in Development Mode**

   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

### Project Structure

```
mukti-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server implementation
│   ├── types.ts              # Type definitions
│   ├── response-strategies.ts # Strategic response generation
│   └── tests/                # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Development Guidelines

### Code Style

We follow strict TypeScript and code quality standards:

**TypeScript Standards:**

- Use strict TypeScript configuration
- All functions must have proper type annotations
- No `any` types unless absolutely necessary
- Prefer interfaces over types for object shapes
- Use enums for constants with multiple values

**Code Formatting:**

- We use Prettier for code formatting
- Run `npm run format` before committing
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline structures

**Naming Conventions:**

- **Classes**: PascalCase (`SocraticEngine`)
- **Functions/Methods**: camelCase (`generateQuestions`)
- **Constants**: UPPER_SNAKE_CASE (`QUERY_TYPE`)
- **Types/Interfaces**: PascalCase (`QueryType`, `SocraticResponse`)
- **Files**: kebab-case (`response-strategies.ts`)

### Architecture Patterns

**Core Classes:**

- `SocraticEngine`: Core questioning logic
- `ResponseStrategyFactory`: Context-aware response generation
- Keep classes focused on single responsibilities

**Type Safety:**

- Use the types defined in `types.ts`
- Create new types for new features
- Export types that might be used by external code
- Document complex types with JSDoc comments

**Error Handling:**

- Use proper error types and messages
- Log errors appropriately for debugging
- Provide graceful fallbacks where possible
- Don't expose internal errors to users

## 🧪 Testing Requirements

### Test Coverage

- All new features must include tests
- Aim for >80% test coverage
- Test both happy paths and error cases
- Include integration tests for MCP handlers

### Test Types

**Unit Tests:**

```typescript
// Example unit test structure
describe("SocraticEngine", () => {
  describe("generateQuestions", () => {
    it("should generate appropriate questions for coding queries", () => {
      const questions = SocraticEngine.generateQuestions(
        "How do I debug this function?",
        QueryType.CODING,
        SocraticTechnique.ELENCHUS,
      );

      expect(questions).toHaveLength(greaterThan(0));
      expect(questions[0]).toContain("assumption");
    });
  });
});
```

**Integration Tests:**

- Test MCP server request/response cycles
- Verify proper JSON-RPC handling
- Test resource and tool endpoints

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="SocraticEngine"
```

## 📝 Documentation Standards

### Code Documentation

**JSDoc Comments:**

````typescript
/**
 * Generates Socratic questions based on query type and technique
 *
 * @param query - The user's input query
 * @param queryType - The categorized type of query
 * @param technique - The Socratic technique to apply
 * @returns Array of thoughtful questions to guide the user
 *
 * @example
 * ```typescript
 * const questions = SocraticEngine.generateQuestions(
 *   "How do I fix this bug?",
 *   QueryType.CODING,
 *   SocraticTechnique.ELENCHUS
 * );
 * ```
 */
static generateQuestions(
  query: string,
  queryType: QueryType,
  technique: SocraticTechnique
): string[] {
  // Implementation
}
````

**README Updates:**

- Update README.md when adding new features
- Include usage examples for new functionality
- Document configuration changes
- Keep installation instructions current

### Type Documentation

Document complex types and their usage:

```typescript
/**
 * Represents a user's learning session with progress tracking
 *
 * @interface UserSession
 * @property sessionId - Unique identifier for the session
 * @property queryHistory - Array of past queries with metadata
 * @property preferences - User's learning preferences and settings
 */
export type UserSession = {
  sessionId: string;
  queryHistory: QueryHistoryItem[];
  preferences: UserPreferences;
};
```

## 🔄 Contribution Workflow

### 1. Choose an Issue

- Look for `good-first-issue` labels if you're new
- Comment on the issue to express interest
- Wait for confirmation before starting work

### 2. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/issue-number-short-description

# Examples:
git checkout -b feature/001-user-session-management
git checkout -b bugfix/question-generation-error
git checkout -b docs/api-documentation
```

### 3. Implement Your Changes

- Follow the code style guidelines
- Write tests for new functionality
- Update documentation as needed
- Keep commits small and focused
- Write clear commit messages

### 4. Commit Guidelines

**Commit Message Format:**

```
type(mukti-mcp-server): brief description

Longer description if needed

Fixes #issue-number
```

**Commit Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
git commit -m "feat(sessions): implement user session management

Add UserSession type implementation with persistence
and query history tracking.

Fixes #1"

git commit -m "fix(questions): handle empty query input gracefully

Fixes #15"
```

### 5. Submit a Pull Request

**Before Submitting:**

- Ensure all tests pass: `npm test`
- Run linting: `npm run lint`
- Format code: `npm run format`
- Update documentation if needed
- Rebase on latest main if needed

**Pull Request Template:**

```markdown
## Description

Brief description of changes

## Issue

Fixes #[issue-number]

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass

## Documentation

- [ ] Code comments added/updated
- [ ] README updated if needed
- [ ] API documentation updated if needed

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No console.log statements left in code
- [ ] Types are properly defined
```

## 🎯 Types of Contributions

### 🐛 Bug Fixes

- Report bugs with detailed reproduction steps
- Include environment information
- Provide minimal reproduction cases
- Test fixes thoroughly

### ✨ New Features

- Discuss major features in issues first
- Follow existing patterns and architecture
- Include comprehensive tests
- Update documentation

### 📚 Documentation

- Improve code comments and JSDoc
- Update README and guides
- Add examples and tutorials
- Fix typos and clarity issues

### 🧪 Testing

- Add missing test coverage
- Improve test quality and clarity
- Add integration and end-to-end tests
- Performance testing

### 🎨 UI/UX (Future)

- Design improvements for any future interfaces
- Accessibility enhancements
- User experience research and feedback

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Communication

- Use GitHub issues for bug reports and feature requests
- Comment on issues before starting work
- Ask questions if requirements are unclear
- Provide context in pull request descriptions

### Review Process

- All changes require review before merging
- Address feedback promptly and thoughtfully
- Be open to suggestions and improvements
- Help review others' contributions

## 🔧 Advanced Development

### Adding New Socratic Techniques

1. Add the technique to `SocraticTechnique` enum in `types.ts`
2. Implement question generation logic in `SocraticEngine`
3. Add response strategy support in `ResponseStrategyFactory`
4. Include comprehensive tests
5. Document the technique and its applications

### Extending Query Types

1. Add new type to `QueryType` enum
2. Implement question templates for all techniques
3. Add appropriate resource curation
4. Update response strategies
5. Test thoroughly across all features

### Database Integration (Future)

When implementing database features:

- Use proper migrations
- Implement connection pooling
- Add proper error handling
- Include database tests
- Document schema changes

## 📋 Issue Labels

**Type Labels:**

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation improvements
- `question` - Further information requested

**Priority Labels:**

- `priority: high` - Critical issues
- `priority: medium` - Important improvements
- `priority: low` - Nice-to-have features

**Status Labels:**

- `good-first-issue` - Great for newcomers
- `help-wanted` - Community help needed
- `in-progress` - Someone is working on this
- `needs-review` - Ready for review

## 🆘 Getting Help

### Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Support Channels

- GitHub Issues - For bugs and feature requests
- GitHub Discussions - For questions and ideas
- Pull Request Comments - For code review discussions

### Maintainers

Tag maintainers in issues when you need help:

- For technical questions about architecture
- When you're stuck on implementation
- For clarification on requirements
- When you need a review

## 📈 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Schedule

- Patch releases: As needed for critical fixes
- Minor releases: Monthly for new features
- Major releases: When significant architecture changes occur

## 🎉 Recognition

Contributors are recognized through:

- Release notes acknowledgments
- README contributor section

## 📜 License

By contributing to Mukti MCP Server, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Mukti! Your efforts help make Socratic learning accessible to everyone. Together, we're building tools that don't just provide answers, but help people learn to ask better questions.

**Happy Contributing! 🚀**
