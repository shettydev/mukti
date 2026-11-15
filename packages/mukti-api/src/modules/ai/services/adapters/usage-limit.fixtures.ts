/** Representative vendor failures. Unrecognized text must keep the generic CLI error. */
export const CLI_USAGE_LIMIT_FIXTURES = {
  antigravity: [
    'RESOURCE_EXHAUSTED: quota exceeded for this model',
    'Quota exhausted. Retry after reset.',
    'Rate limit exceeded for the selected model',
  ],
  'claude-code': [
    'Usage limit reached. Your limit resets at 5pm.',
    "You've hit your limit · resets 5pm (America/New_York)",
    'Rate limit exceeded. Please try again later.',
  ],
  codex: [
    '{"error":{"type":"usage_limit_reached","message":"You have hit your usage limit"}}',
    'Rate limit reached for requests',
    'Too many requests. Please try again later.',
  ],
} as const;

export const CLI_NON_LIMIT_FIXTURES = [
  'Not signed in. Please authenticate.',
  'Invalid model selected',
  'Connection refused',
  'Permission denied',
];
