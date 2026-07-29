jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { DialogueAIService } from '../dialogue-ai.service';

/**
 * Regression coverage for the local-mode placeholder bug.
 *
 * The claude-code provider is handed an empty API key by design (it runs on the
 * developer's own CLI auth). Treating that empty key as "AI unavailable" made
 * every Canvas / Thought Map dialogue return canned placeholder questions
 * without ever invoking the provider. Provider failures were likewise swallowed
 * into canned text, hiding real misconfiguration from the user.
 */
describe('DialogueAIService', () => {
  const nodeContext = {
    nodeId: 'seed',
    nodeLabel: 'Seed label',
    nodeType: 'seed' as const,
  };
  const problemStructure = { roots: [], seed: '', soil: [] };

  const mockSend = jest.fn();
  const chatClientFactory = {
    create: jest.fn(() => ({ chat: { send: mockSend } })),
  };
  const configService = { get: jest.fn().mockReturnValue('https://mukti.app') };

  const makeService = (isClaudeCode: boolean) =>
    new DialogueAIService(
      configService as any,
      chatClientFactory as any,
      {
        isClaudeCodeProvider: jest.fn().mockReturnValue(isClaudeCode),
      } as any,
    );

  const aiPayload = (content: string) => ({
    choices: [{ message: { content } }],
    usage: { completion_tokens: 5, prompt_tokens: 10, total_tokens: 15 },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    chatClientFactory.create.mockReturnValue({ chat: { send: mockSend } });
  });

  describe('claude-code provider (empty API key by design)', () => {
    it('calls the provider instead of returning a placeholder', async () => {
      mockSend.mockResolvedValue(aiPayload('What evidence supports that?'));

      const result = await makeService(true).generateScaffoldedResponse(
        nodeContext,
        problemStructure,
        [],
        'I am stuck',
        'sonnet',
        '', // empty key — claude-code uses the developer's own auth
      );

      expect(chatClientFactory.create).toHaveBeenCalledWith('');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('What evidence supports that?');
      expect(result.model).not.toBe('fallback');
    });

    it('calls the provider on the Thought Map prompt path too', async () => {
      mockSend.mockResolvedValue(aiPayload('What would change your mind?'));

      const result = await makeService(
        true,
      ).generateScaffoldedResponseWithPrompt(
        'System prompt',
        [],
        'I am stuck',
        'sonnet',
        '',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('What would change your mind?');
    });
  });

  describe('surfacing failures instead of placeholder answers', () => {
    it('throws the provider error rather than returning canned text', async () => {
      mockSend.mockRejectedValue(
        new Error('The `claude` CLI was not found on PATH.'),
      );

      await expect(
        makeService(true).generateScaffoldedResponse(
          nodeContext,
          problemStructure,
          [],
          'I am stuck',
          'sonnet',
          '',
        ),
      ).rejects.toThrow('The `claude` CLI was not found on PATH.');
    });

    it('throws when the provider returns an empty completion', async () => {
      mockSend.mockResolvedValue(aiPayload(''));

      await expect(
        makeService(true).generateScaffoldedResponseWithPrompt(
          'System prompt',
          [],
          'I am stuck',
          'sonnet',
          '',
        ),
      ).rejects.toThrow('empty response');
    });

    it('throws an actionable error when a key-based provider has no key', async () => {
      await expect(
        makeService(false).generateScaffoldedResponse(
          nodeContext,
          problemStructure,
          [],
          'I am stuck',
          'openai/gpt-5-mini',
          '',
        ),
      ).rejects.toThrow('No AI API key is configured');

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('openrouter provider (key present)', () => {
    it('still generates normally', async () => {
      mockSend.mockResolvedValue(aiPayload('What do you mean by that?'));

      const result = await makeService(false).generateResponse(
        nodeContext,
        problemStructure,
        [],
        'I am stuck',
        'openai/gpt-5-mini',
        'sk-test-key',
      );

      expect(chatClientFactory.create).toHaveBeenCalledWith('sk-test-key');
      expect(result.content).toBe('What do you mean by that?');
      expect(result.totalTokens).toBe(15);
    });
  });
});
