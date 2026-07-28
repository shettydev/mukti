import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { AiKeyResolver } from '../ai-key-resolver.service';

describe('AiKeyResolver', () => {
  let resolver: AiKeyResolver;

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    lean: jest.fn(),
    select: jest.fn().mockReturnThis(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAiPolicyService = {
    isClaudeCodeProvider: jest.fn(),
  };

  const mockAiSecretsService = {
    decryptString: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resolver = new AiKeyResolver(
      mockUserModel as any,
      mockConfigService as any,
      mockAiPolicyService as any,
      mockAiSecretsService as any,
    );
  });

  it('returns an empty key for the claude-code provider (own auth)', async () => {
    mockAiPolicyService.isClaudeCodeProvider.mockReturnValue(true);

    await expect(
      resolver.resolve({
        usedByok: true,
        userId: new Types.ObjectId().toString(),
      }),
    ).resolves.toBe('');
    // Claude Code short-circuits before any BYOK/server-key lookup.
    expect(mockUserModel.findById).not.toHaveBeenCalled();
    expect(mockConfigService.get).not.toHaveBeenCalled();
  });

  it('returns the decrypted BYOK key when the user has one', async () => {
    mockAiPolicyService.isClaudeCodeProvider.mockReturnValue(false);
    mockUserModel.lean.mockResolvedValue({
      openRouterApiKeyEncrypted: 'encrypted-key',
    });
    mockAiSecretsService.decryptString.mockReturnValue('decrypted-key');

    await expect(
      resolver.resolve({
        usedByok: true,
        userId: new Types.ObjectId().toString(),
      }),
    ).resolves.toBe('decrypted-key');
    expect(mockAiSecretsService.decryptString).toHaveBeenCalledWith(
      'encrypted-key',
    );
  });

  it('throws when BYOK is requested but the user has no stored key', async () => {
    mockAiPolicyService.isClaudeCodeProvider.mockReturnValue(false);
    mockUserModel.lean.mockResolvedValue(null);

    await expect(
      resolver.resolve({
        usedByok: true,
        userId: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow('OPENROUTER_KEY_MISSING');
  });

  it('returns the configured server key for non-BYOK requests', async () => {
    mockAiPolicyService.isClaudeCodeProvider.mockReturnValue(false);
    mockConfigService.get.mockReturnValue('server-key');

    await expect(
      resolver.resolve({
        usedByok: false,
        userId: new Types.ObjectId().toString(),
      }),
    ).resolves.toBe('server-key');
  });

  it('throws when no server key is configured in hosted mode', async () => {
    mockAiPolicyService.isClaudeCodeProvider.mockReturnValue(false);
    mockConfigService.get.mockReturnValue('');

    await expect(
      resolver.resolve({
        usedByok: false,
        userId: new Types.ObjectId().toString(),
      }),
    ).rejects.toThrow('OPENROUTER_API_KEY not configured');
  });
});
