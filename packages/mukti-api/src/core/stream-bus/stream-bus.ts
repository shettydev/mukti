import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { redisConnectionOptions } from '../redis/redis-options';

/** Receives every event published under one namespace, from any instance. */
export type StreamBusHandler = (key: string, event: unknown) => void;

/**
 * Carries live stream events (SSE) from whichever process produced them to
 * whichever process holds the client's connection.
 *
 * @remarks
 * Jobs run on BullMQ workers, which may not be the API instance the browser
 * is connected to. Publishing through the bus, rather than calling the
 * connection's emit function directly, lets any number of API and worker
 * processes serve the same users.
 *
 * Namespaces separate surfaces (`conversation`, `dialogue`, `extraction`);
 * the key identifies the stream within one (a conversation id, a
 * `session:node` pair, a job id).
 */
export abstract class StreamBus {
  /** Subscribes to a namespace. Returns a function that unsubscribes. */
  abstract listen(namespace: string, handler: StreamBusHandler): () => void;

  /** Sends an event to every listener of the namespace on every instance. */
  abstract publish(namespace: string, key: string, event: unknown): void;
}

/**
 * Delivers events synchronously within this process. Used in local mode (one
 * process, no Redis) and as the default in unit tests.
 */
export class InProcessStreamBus extends StreamBus {
  private readonly handlers = new Map<string, Set<StreamBusHandler>>();

  listen(namespace: string, handler: StreamBusHandler): () => void {
    const set = this.handlers.get(namespace) ?? new Set();
    set.add(handler);
    this.handlers.set(namespace, set);
    return () => set.delete(handler);
  }

  publish(namespace: string, key: string, event: unknown): void {
    for (const handler of this.handlers.get(namespace) ?? []) {
      handler(key, event);
    }
  }
}

/** Redis channel every instance publishes to and subscribes on. */
export const STREAM_BUS_CHANNEL = 'mukti:stream-events';

/** Token for the Redis clients, so tests can inject fakes. */
export const STREAM_BUS_REDIS = Symbol('STREAM_BUS_REDIS');

export interface StreamBusRedisClients {
  publisher: Pick<Redis, 'publish' | 'quit'>;
  subscriber: Pick<Redis, 'on' | 'quit' | 'subscribe'>;
}

interface Envelope {
  event: unknown;
  key: string;
  namespace: string;
}

/**
 * Fans events out across instances with Redis pub/sub on one channel.
 *
 * @remarks
 * Every instance receives every event and drops the ones it holds no
 * connection for, which is fine at this scale and keeps ordering simple: one
 * publisher connection per process, and Redis preserves order per publisher,
 * so a job's `processing → message → complete` sequence arrives in order. An
 * instance's own events also come back through Redis, so nothing is
 * delivered twice.
 *
 * Pub/sub is fire-and-forget like the in-memory emit it replaces: a client
 * that is not connected when an event is published does not get it.
 */
@Injectable()
export class RedisStreamBus extends StreamBus implements OnModuleDestroy {
  private readonly handlers = new Map<string, Set<StreamBusHandler>>();

  private readonly logger = new Logger(RedisStreamBus.name);

  constructor(
    @Inject(STREAM_BUS_REDIS) private readonly redis: StreamBusRedisClients,
  ) {
    super();
    this.redis.subscriber.on('message', (channel: string, raw: string) => {
      if (channel === STREAM_BUS_CHANNEL) {
        this.dispatch(raw);
      }
    });
    void this.redis.subscriber
      .subscribe(STREAM_BUS_CHANNEL)
      .catch((error: unknown) =>
        this.logger.error(
          `Stream bus could not subscribe; live updates from other instances will be missed: ${String(error)}`,
        ),
      );
  }

  listen(namespace: string, handler: StreamBusHandler): () => void {
    const set = this.handlers.get(namespace) ?? new Set();
    set.add(handler);
    this.handlers.set(namespace, set);
    return () => set.delete(handler);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.redis.publisher.quit(),
      this.redis.subscriber.quit(),
    ]);
  }

  publish(namespace: string, key: string, event: unknown): void {
    const envelope: Envelope = { event, key, namespace };
    void this.redis.publisher
      .publish(STREAM_BUS_CHANNEL, JSON.stringify(envelope))
      .catch((error: unknown) =>
        this.logger.error(
          `Stream event ${namespace}/${key} not published: ${String(error)}`,
        ),
      );
  }

  private dispatch(raw: string): void {
    let envelope: Envelope;
    try {
      envelope = JSON.parse(raw) as Envelope;
    } catch {
      this.logger.warn('Dropped malformed stream bus message');
      return;
    }

    for (const handler of this.handlers.get(envelope.namespace) ?? []) {
      try {
        handler(envelope.key, envelope.event);
      } catch (error) {
        this.logger.error(
          `Stream bus handler for ${envelope.namespace} failed: ${String(error)}`,
        );
      }
    }
  }
}

/** Builds the Redis publisher/subscriber pair from app config. */
export function createStreamBusRedisClients(
  configService: ConfigService,
): StreamBusRedisClients {
  const publisher = new Redis(redisConnectionOptions(configService));
  // A subscribed connection cannot issue other commands, so it needs its own.
  const subscriber = publisher.duplicate();
  return { publisher, subscriber };
}
