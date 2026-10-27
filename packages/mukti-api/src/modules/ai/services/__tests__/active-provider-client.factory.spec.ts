import type { ConfigService } from '@nestjs/config';

import { spawn } from 'child_process';

import type { AiChatClientFactory } from '../../types/ai-chat-client.interface';

import { ActiveProviderClientFactory } from '../active-provider-client.factory';
import { AiProviderRegistry } from '../ai-provider.registry';
import { fakeChild } from './fake-child';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

const request = {
  messages: [{ content: 'Why is the sky blue?', role: 'user' as const }],
  model: '',
  responseFormat: undefined,
};

/**
 * The seam every AI surface injects.
 *
 * @remarks
 * A provider switch from Settings has to reach the next request on every
 * surface without reconfiguring any of them, and must not reroute a turn that
 * has already obtained its client. Both properties live here.
 */
describe('ActiveProviderClientFactory', () => {
  function registry(provider?: string): AiProviderRegistry {
    const config = {
      get: jest.fn((key: string) =>
        key === 'AI_PROVIDER' ? provider : undefined,
      ),
    } as unknown as ConfigService;
    return new AiProviderRegistry(config);
  }

  function hosted(): AiChatClientFactory & { create: jest.Mock } {
    return {
      create: jest.fn(() => ({ chat: { send: jest.fn() } })),
    };
  }

  beforeEach(() => {
    spawnMock.mockReset();
    spawnMock.mockImplementation(
      () =>
        fakeChild({
          code: 0,
          stdout: '{"result":"What do you think?"}',
        }) as never,
    );
  });

  it('serves OpenRouter, passing the key through, when no local CLI is active', () => {
    const openRouter = hosted();
    const factory = new ActiveProviderClientFactory(registry(), openRouter);

    factory.create('sk-user');

    expect(openRouter.create).toHaveBeenCalledWith('sk-user');
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('serves the active local CLI without consulting OpenRouter', async () => {
    const openRouter = hosted();
    const factory = new ActiveProviderClientFactory(
      registry('claude'),
      openRouter,
    );

    await factory.create('').chat.send(request);

    expect(openRouter.create).not.toHaveBeenCalled();
    expect(spawnMock.mock.calls[0][0]).toBe('claude');
  });

  it('follows a switch on the next create(), with no reconfiguration', async () => {
    const providers = registry('claude-code');
    const factory = new ActiveProviderClientFactory(providers, hosted());

    await factory.create('').chat.send(request);
    providers.setActiveLocalCli('codex');
    await factory
      .create('')
      .chat.send(request)
      .catch(() => undefined); // Codex's envelope differs; only the binary matters here.

    expect(spawnMock.mock.calls.map(([command]) => command)).toEqual([
      'claude',
      'codex',
    ]);
  });

  it('keeps a client on the provider it was created for, across a switch', async () => {
    const providers = registry('claude-code');
    const factory = new ActiveProviderClientFactory(providers, hosted());

    const startedBefore = factory.create('');
    providers.setActiveLocalCli('codex');
    await startedBefore.chat.send(request);

    expect(spawnMock.mock.calls[0][0]).toBe('claude');
  });
});
