import autocomplete from 'inquirer-autocomplete-prompt';

const scopes = [
  // Project scopes
  'api',
  'web',
  'mcp-server',

  // Infrastructure & tooling
  'config',
  'ci',
  'deps',
  'docker',
  'deployment',
  'monorepo',

  // Documentation
  'docs',
  'readme',

  // Database & cache
  'db',
  'redis',

  // UI/UX
  'ui',
  'components',
  'styles',

  // Testing
  'test',
  'e2e',

  // Release
  'release'
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', scopes],
    'type-enum': [
      2,
      'always',
      [
        'feat',      // New feature
        'fix',       // Bug fix
        'docs',      // Documentation only
        'style',     // Code style (formatting, missing semi-colons, etc.)
        'refactor',  // Code refactoring
        'perf',      // Performance improvement
        'test',      // Adding/updating tests
        'build',     // Build system or external dependencies
        'ci',        // CI/CD changes
        'chore',     // Other changes that don't modify src/test files
        'revert',    // Revert previous commit
        'wip',       // Work in progress (avoid in main branch)
        'init'       // Initial commit
      ]
    ],
    'subject-case': [2, 'always', 'sentence-case'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100]
  },
  prompt: {
    settings: {
      enableMultipleScopes: true,
      scopeEnumSeparator: ','
    },
    messages: {
      skip: '(press enter to skip)',
      max: 'upper %d chars',
      min: '%d chars at least',
      emptyWarning: 'can not be empty',
      upperLimitWarning: 'over limit',
      lowerLimitWarning: 'below limit'
    },
    questions: {
      type: {
        description: "Select the type of change you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨'
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛'
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚'
          },
          style: {
            description: 'Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '💎'
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '📦'
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀'
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨'
          },
          build: {
            description: 'Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '🛠'
          },
          ci: {
            description: 'Changes to CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '⚙️'
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '♻️'
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑'
          }
        }
      },
      scope: {
        description: 'What is the scope of this change (type to filter)?',
        // Enable autocomplete for scopes
        type: 'autocomplete',
        source: (answersSoFar, input) => {
          input = input || '';
          return new Promise((resolve) => {
            const fuzzyResult = scopes.filter((scope) =>
              scope.toLowerCase().includes(input.toLowerCase())
            );
            resolve(fuzzyResult);
          });
        }
      },
      subject: {
        description: 'Write a short, imperative tense description of the change (AI can help with "bun run ai:commit")'
      },
      body: {
        description: 'Provide a longer description of the change (AI can help with "bun run ai:commit")'
      },
      isBreaking: {
        description: 'Are there any breaking changes?'
      },
      breakingBody: {
        description: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself'
      },
      breaking: {
        description: 'Describe the breaking changes'
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?'
      },
      issuesBody: {
        description: 'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself'
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123".)'
      }
    }
  }
};
