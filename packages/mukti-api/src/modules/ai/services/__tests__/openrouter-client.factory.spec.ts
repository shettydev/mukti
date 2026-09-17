/**
 * Guards the one behaviour that keeps a declared response shape from reaching
 * the hosted API.
 *
 * @remarks
 * These assertions are load-bearing rather than incidental. Both learner-facing
 * surfaces render a completion's content verbatim as the assistant message, so
 * if `responseFormat` were forwarded, OpenRouter would return
 * `{"question":"…"}` and that raw JSON would be shown to a learner. The failure
 * is silent on the sending side — nothing errors, the request succeeds — so the
 * only place it can be caught is here, on what actually reaches the SDK.
 */
import { OpenRouter } from '@openrouter/sdk';

import { SOCRATIC_QUESTION_FORMAT } from '../../types/ai-response-format.interface';
import { OpenRouterClientFactory } from '../openrouter-client.factory';

const sendMock = jest.fn().mockResolvedValue({ choices: [], usage: undefined });

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(),
}));

const OpenRouterMock = OpenRouter as unknown as jest.Mock;

const baseRequest = {
  messages: [{ content: 'How do I center a div?', role: 'user' as const }],
  model: 'openai/gpt-5-mini',
};

describe('OpenRouterClientFactory', () => {
  let factory: OpenRouterClientFactory;

  beforeEach(() => {
    sendMock.mockClear();
    OpenRouterMock.mockReset();
    OpenRouterMock.mockImplementation(() => ({
      chat: { send: sendMock },
      models: { list: jest.fn() },
    }));
    factory = new OpenRouterClientFactory();
  });

  /** The request the SDK actually received. */
  function forwarded(): Record<string, unknown> {
    return sendMock.mock.calls[0][0] as Record<string, unknown>;
  }

  it('forwards no responseFormat key when the caller declared none', async () => {
    await factory
      .create('key')
      .chat.send({ ...baseRequest, responseFormat: undefined });

    expect(forwarded()).not.toHaveProperty('responseFormat');
  });

  // The case that matters: a learner-facing surface DID declare a shape, and
  // this provider must still not forward it.
  it('forwards no responseFormat key when the caller declared the Socratic shape', async () => {
    await factory
      .create('key')
      .chat.send({ ...baseRequest, responseFormat: SOCRATIC_QUESTION_FORMAT });

    expect(forwarded()).not.toHaveProperty('responseFormat');
  });

  it('leaves the rest of the request untouched', async () => {
    await factory.create('key').chat.send({
      ...baseRequest,
      responseFormat: SOCRATIC_QUESTION_FORMAT,
      stream: false,
      temperature: 0.7,
    });

    expect(forwarded()).toEqual({
      ...baseRequest,
      stream: false,
      temperature: 0.7,
    });
  });

  it('passes per-request options through unchanged', async () => {
    const options = { headers: { 'X-Title': 'Mukti - Thinking Workspace' } };

    await factory
      .create('key')
      .chat.send({ ...baseRequest, responseFormat: undefined }, options);

    expect(sendMock.mock.calls[0][1]).toEqual(options);
  });

  it('builds the SDK client with the supplied API key', () => {
    factory.create('sk-or-test');

    expect(OpenRouterMock).toHaveBeenCalledWith({ apiKey: 'sk-or-test' });
  });

  // The catalogue is an OpenRouter-only surface and must not be reachable
  // through the provider-agnostic chat seam.
  it('exposes the raw SDK client only through createSdkClient', () => {
    expect(factory.createSdkClient('key')).toHaveProperty('models');
    expect(factory.create('key')).not.toHaveProperty('models');
  });
});
