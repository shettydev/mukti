jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { StreamService } from '../../../modules/conversations/services/stream.service';
import { DialogueStreamService } from '../../../modules/dialogue/services/dialogue-stream.service';
import { MapExtractionService } from '../../../modules/thought-map/services/map-extraction.service';
import {
  InProcessStreamBus,
  RedisStreamBus,
  type StreamBusRedisClients,
  streamChannel,
} from '../stream-bus';

/**
 * A stand-in for one Redis server with real channel semantics: a published
 * message reaches only subscribers that subscribed to that channel.
 */
class FakeRedisServer {
  /** Every publish, in order, for asserting where traffic went. */
  readonly published: string[] = [];

  private readonly subscribers: {
    channels: Set<string>;
    listener?: (channel: string, raw: string) => void;
  }[] = [];

  clients(): StreamBusRedisClients {
    const sub: (typeof this.subscribers)[number] = { channels: new Set() };
    this.subscribers.push(sub);

    return {
      publisher: {
        publish: jest.fn((channel: string, raw: string) => {
          this.published.push(channel);
          let receivers = 0;
          for (const s of this.subscribers) {
            if (s.channels.has(channel) && s.listener) {
              s.listener(channel, raw);
              receivers++;
            }
          }
          return Promise.resolve(receivers);
        }) as never,
        quit: jest.fn(() => Promise.resolve('OK')) as never,
      },
      subscriber: {
        on: jest.fn((event: string, listener: never) => {
          if (event === 'message') {
            sub.listener = listener;
          }
        }) as never,
        quit: jest.fn(() => Promise.resolve('OK')) as never,
        subscribe: jest.fn((channel: string) => {
          sub.channels.add(channel);
          return Promise.resolve(sub.channels.size);
        }) as never,
        unsubscribe: jest.fn((channel: string) => {
          sub.channels.delete(channel);
          return Promise.resolve(sub.channels.size);
        }) as never,
      },
    };
  }

  /** How many instances are subscribed to a channel right now. */
  subscriberCount(channel: string): number {
    return this.subscribers.filter((s) => s.channels.has(channel)).length;
  }
}

/** Lets fire-and-forget publishes settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('StreamBus', () => {
  describe('RedisStreamBus across two instances', () => {
    let server: FakeRedisServer;
    let apiInstance: RedisStreamBus;
    let workerInstance: RedisStreamBus;

    beforeEach(() => {
      server = new FakeRedisServer();
      apiInstance = new RedisStreamBus(server.clients());
      workerInstance = new RedisStreamBus(server.clients());
    });

    it('delivers a chat event emitted on the worker to the client on the API instance', async () => {
      const api = new StreamService(apiInstance);
      const worker = new StreamService(workerInstance);
      const emitFn = jest.fn();
      api.addConnection('conv-1', 'user-1', 'conn-1', emitFn);

      worker.emitToConversation('conv-1', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });
      await flush();

      expect(emitFn).toHaveBeenCalledTimes(1);
      expect(emitFn).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          timestamp: expect.any(String),
          type: 'processing',
        }),
      );
    });

    it('delivers node-dialogue events across instances and keeps their order', async () => {
      const api = new DialogueStreamService(apiInstance);
      const worker = new DialogueStreamService(workerInstance);
      const emitFn = jest.fn();
      api.addConnection('map:m1', 'node-1', 'user-1', 'conn-1', emitFn);

      for (const type of ['processing', 'message', 'complete'] as const) {
        worker.emitToNodeDialogue('map:m1', 'node-1', 'dlg-1', {
          data: {} as never,
          type,
        });
      }
      await flush();

      expect(emitFn.mock.calls.map(([event]) => event.type)).toEqual([
        'processing',
        'message',
        'complete',
      ]);
    });

    it('delivers exactly once when the job and client share an instance', async () => {
      const api = new StreamService(apiInstance);
      const emitFn = jest.fn();
      api.addConnection('conv-1', 'user-1', 'conn-1', emitFn);

      api.emitToConversation('conv-1', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });
      await flush();

      expect(emitFn).toHaveBeenCalledTimes(1);
    });

    it('keeps user-targeted events to that user, on whichever instance holds them', async () => {
      const api = new StreamService(apiInstance);
      const worker = new StreamService(workerInstance);
      const mine = jest.fn();
      const theirs = jest.fn();
      api.addConnection('conv-1', 'user-1', 'conn-1', mine);
      api.addConnection('conv-1', 'user-2', 'conn-2', theirs);

      worker.emitToUser('conv-1', 'user-1', {
        data: { code: 'X', message: 'only you', retriable: false },
        type: 'error',
      });
      await flush();

      expect(mine).toHaveBeenCalledTimes(1);
      expect(theirs).not.toHaveBeenCalled();
    });

    it('does not cross namespaces or streams', async () => {
      const chat = new StreamService(apiInstance);
      const nodes = new DialogueStreamService(apiInstance);
      const chatFn = jest.fn();
      const nodeFn = jest.fn();
      chat.addConnection('shared-id', 'user-1', 'conn-1', chatFn);
      nodes.addConnection('shared-id', 'n', 'user-1', 'conn-2', nodeFn);

      new StreamService(workerInstance).emitToConversation('other-conv', {
        data: { jobId: 'j', status: 'started' },
        type: 'processing',
      });
      new StreamService(workerInstance).emitToConversation('shared-id', {
        data: { jobId: 'j', status: 'started' },
        type: 'processing',
      });
      await flush();

      expect(chatFn).toHaveBeenCalledTimes(1);
      expect(nodeFn).not.toHaveBeenCalled();
    });

    it('ignores malformed payloads without throwing', () => {
      const handler = jest.fn();
      apiInstance.listen('conversation', handler);

      const dispatch = (
        apiInstance as unknown as {
          dispatch: (raw: string) => void;
        }
      ).dispatch.bind(apiInstance);
      expect(() => dispatch('not json')).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    it('subscribes to nothing until a connection arrives, and closes both connections on shutdown', async () => {
      const clients = server.clients();
      const bus = new RedisStreamBus(clients);

      expect(clients.subscriber.subscribe).not.toHaveBeenCalled();
      await bus.onModuleDestroy();
      expect(clients.publisher.quit).toHaveBeenCalled();
      expect(clients.subscriber.quit).toHaveBeenCalled();
    });

    it('publishes each stream on its own channel and only holders receive it', async () => {
      const otherInstance = new RedisStreamBus(server.clients());
      const api = new StreamService(apiInstance);
      const other = new StreamService(otherInstance);
      const worker = new StreamService(workerInstance);
      const apiEmit = jest.fn();
      const otherEmit = jest.fn();
      api.addConnection('conv-1', 'user-1', 'conn-1', apiEmit);
      other.addConnection('conv-2', 'user-2', 'conn-2', otherEmit);
      const otherDispatch = jest.spyOn(
        otherInstance as unknown as { dispatch: (raw: string) => void },
        'dispatch',
      );

      worker.emitToConversation('conv-1', {
        data: { jobId: 'j', status: 'started' },
        type: 'processing',
      });
      await flush();

      expect(server.published).toEqual([
        streamChannel('conversation', 'conv-1'),
      ]);
      expect(apiEmit).toHaveBeenCalledTimes(1);
      // The instance holding only conv-2 never even sees conv-1's traffic.
      expect(otherDispatch).not.toHaveBeenCalled();
      expect(otherEmit).not.toHaveBeenCalled();
    });

    it('keeps one subscription per stream across connections and drops it with the last one', async () => {
      const api = new StreamService(apiInstance);
      const channel = streamChannel('conversation', 'conv-1');
      api.addConnection('conv-1', 'user-1', 'tab-1', jest.fn());
      api.addConnection('conv-1', 'user-1', 'tab-2', jest.fn());
      await flush();

      expect(server.subscriberCount(channel)).toBe(1);

      api.removeConnection('conv-1', 'tab-1');
      await flush();
      expect(server.subscriberCount(channel)).toBe(1);

      api.removeConnection('conv-1', 'tab-2');
      await flush();
      expect(server.subscriberCount(channel)).toBe(0);

      // Removing again, or cleaning up an already-empty stream, is harmless.
      api.removeConnection('conv-1', 'tab-2');
      api.cleanupConversation('conv-1');
      api.addConnection('conv-1', 'user-1', 'tab-3', jest.fn());
      await flush();
      expect(server.subscriberCount(channel)).toBe(1);
    });

    it('delivers extraction events from the worker to the instance holding the job stream', async () => {
      const deps = Array.from({ length: 8 }, () => ({}) as never);
      const api = new MapExtractionService(
        ...(deps as [never, never, never, never, never, never, never, never]),
        apiInstance,
      );
      const worker = new MapExtractionService(
        ...(deps as [never, never, never, never, never, never, never, never]),
        workerInstance,
      );
      const emitFn = jest.fn();
      const close = api.addConnection('job-1', 'conn-1', emitFn);
      await flush();

      (
        worker as unknown as {
          emit: (jobId: string, event: { type: string }) => void;
        }
      ).emit('job-1', { type: 'complete' });
      await flush();

      expect(emitFn).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'complete' }),
      );
      close();
      await flush();
      expect(server.subscriberCount(streamChannel('extraction', 'job-1'))).toBe(
        0,
      );
    });

    it('releases the subscription when a stream is cleaned up wholesale', async () => {
      const dialogue = new DialogueStreamService(apiInstance);
      const channel = streamChannel('dialogue', 'session-1:node-1');
      dialogue.addConnection('session-1', 'node-1', 'user-1', 'a', jest.fn());
      dialogue.addConnection('session-1', 'node-1', 'user-1', 'b', jest.fn());
      await flush();
      expect(server.subscriberCount(channel)).toBe(1);

      dialogue.cleanupNodeDialogue('session-1', 'node-1');
      await flush();
      expect(server.subscriberCount(channel)).toBe(0);
    });

    it('keeps a job’s events in order on the receiving instance', async () => {
      const api = new StreamService(apiInstance);
      const worker = new StreamService(workerInstance);
      const emitFn = jest.fn();
      api.addConnection('conv-1', 'user-1', 'conn-1', emitFn);
      await flush();

      worker.emitToConversation('conv-1', {
        data: { jobId: 'j', status: 'started' },
        type: 'processing',
      });
      worker.emitToConversation('conv-1', {
        data: { jobId: 'j', status: 'completed' },
        type: 'progress',
      } as never);
      worker.emitToConversation('conv-1', {
        data: { jobId: 'j' },
        type: 'complete',
      } as never);
      await flush();

      expect(emitFn.mock.calls.map(([event]) => event.type)).toEqual([
        'processing',
        'progress',
        'complete',
      ]);
    });

    it('logs instead of throwing when Redis rejects a publish', async () => {
      const clients = server.clients();
      (clients.publisher.publish as jest.Mock).mockRejectedValueOnce(
        new Error('READONLY'),
      );
      const bus = new RedisStreamBus(clients);

      expect(() => bus.publish('conversation', 'c', {})).not.toThrow();
      await flush();
    });
  });

  describe('InProcessStreamBus (local mode)', () => {
    it('delivers synchronously within one process', () => {
      const bus = new InProcessStreamBus();
      const service = new StreamService(bus);
      const emitFn = jest.fn();
      service.addConnection('conv-1', 'user-1', 'conn-1', emitFn);

      service.emitToConversation('conv-1', {
        data: { jobId: 'job-1', status: 'started' },
        type: 'processing',
      });

      expect(emitFn).toHaveBeenCalledTimes(1);
    });

    it('stops delivering after unlisten', () => {
      const bus = new InProcessStreamBus();
      const handler = jest.fn();
      const unlisten = bus.listen('ns', handler);

      unlisten();
      bus.publish('ns', 'k', {});

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
