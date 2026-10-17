import { StreamService } from '../../../modules/conversations/services/stream.service';
import { DialogueStreamService } from '../../../modules/dialogue/services/dialogue-stream.service';
import {
  InProcessStreamBus,
  RedisStreamBus,
  STREAM_BUS_CHANNEL,
  type StreamBusRedisClients,
} from '../stream-bus';

/**
 * A stand-in for one Redis server: every subscriber registered on it gets
 * every message any publisher sends, like real pub/sub across processes.
 */
class FakeRedisServer {
  private readonly listeners: ((channel: string, raw: string) => void)[] = [];

  clients(): StreamBusRedisClients {
    return {
      publisher: {
        publish: jest.fn((channel: string, raw: string) => {
          for (const listener of this.listeners) {
            listener(channel, raw);
          }
          return Promise.resolve(this.listeners.length);
        }) as never,
        quit: jest.fn(() => Promise.resolve('OK')) as never,
      },
      subscriber: {
        on: jest.fn((event: string, listener: never) => {
          if (event === 'message') {
            this.listeners.push(listener);
          }
        }) as never,
        quit: jest.fn(() => Promise.resolve('OK')) as never,
        subscribe: jest.fn(() => Promise.resolve(1)) as never,
      },
    };
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

    it('subscribes on the shared channel and closes both connections on shutdown', async () => {
      const clients = server.clients();
      const bus = new RedisStreamBus(clients);

      expect(clients.subscriber.subscribe).toHaveBeenCalledWith(
        STREAM_BUS_CHANNEL,
      );
      await bus.onModuleDestroy();
      expect(clients.publisher.quit).toHaveBeenCalled();
      expect(clients.subscriber.quit).toHaveBeenCalled();
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
