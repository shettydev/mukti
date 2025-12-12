export default {
  provider: 'openrouter',
  model: 'deepseek/deepseek-v3.2',
  // OpenRouter API configuration
  apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  // Will use OPENROUTER_API_KEY from environment

  // Commit message generation settings
  generate: 3, // Generate 3 options to choose from
  type: 'conventional', // Use conventional commits format
  maxLength: 100, // Max length for commit header

  // Prompt configuration
  systemPrompt: `You are an expert at writing clear, concise git commit messages following the Conventional Commits specification.

Rules:
1. Format: <type>(<scope>): <subject>
2. Type must be one of: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
3. Scope should be from: api, web, mcp-server, config, ci, deps, docker, deployment, monorepo, docs, readme, db, redis, ui, components, styles, test, e2e, release, or a combination of two or more scopes separated by ',' (e.g., api,web)
4. Subject must be imperative mood (e.g., "add" not "added")
5. Subject must be sentence-case (Start with a capital letter)
6. No period at the end
7. Keep header under 100 characters
8. CRITICAL: Body lines must be 100 characters or less. Wrap long lines.
9. Be specific and descriptive but concise`,

  userPromptTemplate: `Based on the following git diff, generate {count} conventional commit messages.

Git diff:
\`\`\`
{diff}
\`\`\`

IMPORTANT: Respond with ONLY a valid JSON array, no markdown formatting, no explanation.

Required JSON format:
[
  {
    "type": "feat",
    "scope": "api",
    "subject": "Add user authentication",
    "body": "Implemented JWT-based authentication with refresh tokens.\\nAdded middleware for token validation."
  }
]

Rules:
- Type must be: feat, fix, docs, style, refactor, perf, test, build, ci, chore, or revert
- Scope from: api, web, mcp-server, config, ci, deps, docker, deployment, monorepo, docs, readme, db, redis, ui, components, styles, test, e2e, release, or a combination of two or more scopes separated by ',' (e.g., api,web)
- Subject must be imperative mood (e.g., "add" not "added")
- Subject must be sentence-case (Start with a capital letter)
- CRITICAL: Each line in body must be 100 characters or less. Use \\n for line breaks.
- Body is optional but recommended
- Keep body concise, 1-3 short lines

Respond with ONLY the JSON array, nothing else.`,
};
