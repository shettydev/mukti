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
 *
 * Stream services call {@link track} when an instance gains its first local
 * connection for a stream and {@link untrack} when it loses its last, so a
 * transport can deliver each stream only to instances that hold it.
 */
export abstract class StreamBus {
  /** Subscribes to a namespace. Returns a function that unsubscribes. */
  abstract listen(namespace: string, handler: StreamBusHandler): () => void;

  /** Sends an event to the instances holding this stream. */
  abstract publish(namespace: string, key: string, event: unknown): void;

  /**
   * This instance now holds a connection for the stream. Reference counted.
   *
   * @returns Resolves once events published from now on will be delivered
   * here. Never rejects; a failed subscribe is logged and resolves, so callers
   * that re-check state afterwards still make progress.
   */
  abstract track(namespace: string, key: string): Promise<void>;

  /** Releases one {@link track}. */
  abstract untrack(namespace: string, key: string): void;
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

  /** One process sees every stream, so there is nothing to subscribe to. */
  track(): Promise<void> {
    return Promise.resolve();
  }

  /** See {@link track}. */
  untrack(): void {
    return;
  }
}

/** Prefix of every per-stream Redis channel: `mukti:stream:{namespace}:{key}`. */
export const STREAM_BUS_CHANNEL_PREFIX = 'mukti:stream:';

/** Builds the Redis channel name for one stream. */
export function streamChannel(namespace: string, key: string): string {
  return `${STREAM_BUS_CHANNEL_PREFIX}${namespace}:${key}`;
}

/** Token for the Redis clients, so tests can inject fakes. */
export const STREAM_BUS_REDIS = Symbol('STREAM_BUS_REDIS');

export interface StreamBusRedisClients {
  publisher: Pick<Redis, 'publish' | 'quit'>;
  subscriber: Pick<Redis, 'on' | 'quit' | 'subscribe' | 'unsubscribe'>;
}

interface Envelope {
  event: unknown;
  key: string;
  namespace: string;
}

/**
 * Fans events out across instances with one Redis pub/sub channel per stream.
 *
 * @remarks
 * An instance subscribes to a stream's channel only while it holds at least
 * one connection for that stream, so each event reaches only the instances
 * that can deliver it and Redis traffic grows with active streams, not with
 * instances times total traffic.
 *
 * Ordering: each process has one publisher connection, and Redis preserves
 * order per publisher and channel, so a job's `processing → message →
 * complete` sequence arrives in order. An instance's own events reach it
 * through Redis like everyone else's, so nothing is delivered twice.
 *
 * Pub/sub is fire-and-forget: a client gets only events published after its
 * instance has subscribed to the stream, which is one Redis round trip after
 * the connection opens. {@link track} resolves at that point, so a stream
 * whose job may already be running can re-check the job afterwards (the
 * extraction stream does). Ioredis re-subscribes tracked channels on
 * reconnect.
 */
@Injectable()
export class RedisStreamBus extends StreamBus implements OnModuleDestroy {
  private readonly handlers = new Map<string, Set<StreamBusHandler>>();

  private readonly logger = new Logger(RedisStreamBus.name);

  /** The subscribe in flight (or done) for each tracked channel. */
  private readonly subscribed = new Map<string, Promise<void>>();

  /** Local connection count per subscribed channel. */
  private readonly tracked = new Map<string, number>();

  constructor(
    @Inject(STREAM_BUS_REDIS) private readonly redis: StreamBusRedisClients,
  ) {
    super();
    this.redis.subscriber.on('message', (channel: string, raw: string) => {
      if (channel.startsWith(STREAM_BUS_CHANNEL_PREFIX)) {
        this.dispatch(raw);
      }
    });
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
      .publish(streamChannel(namespace, key), JSON.stringify(envelope))
      .catch((error: unknown) =>
        this.logger.error(
          `Stream event ${namespace}/${key} not published: ${String(error)}`,
        ),
      );
  }

  track(namespace: string, key: string): Promise<void> {
    const channel = streamChannel(namespace, key);
    const count = this.tracked.get(channel) ?? 0;
    this.tracked.set(channel, count + 1);

    const pending = this.subscribed.get(channel);
    if (count > 0 && pending) {
      return pending;
    }

    const ready = this.redis.subscriber.subscribe(channel).then(
      () => undefined,
      (error: unknown) => {
        this.logger.error(
          `Stream bus could not subscribe to ${channel}; this client will miss live updates: ${String(error)}`,
        );
      },
    );
    this.subscribed.set(channel, ready);
    return ready;
  }

  untrack(namespace: string, key: string): void {
    const channel = streamChannel(namespace, key);
    const count = this.tracked.get(channel) ?? 0;

    if (count > 1) {
      this.tracked.set(channel, count - 1);
      return;
    }
    if (count === 0) {
      return;
    }

    this.tracked.delete(channel);
    this.subscribed.delete(channel);
    void this.redis.subscriber
      .unsubscribe(channel)
      .catch((error: unknown) =>
        this.logger.warn(
          `Stream bus could not unsubscribe from ${channel}: ${String(error)}`,
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
