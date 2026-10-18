/**
 * Compile-time check that the client's stream event types match the API's
 * wire contract. This file has no runtime code; it only fails `tsc` (the web
 * `type-check` target) if the two sides drift apart.
 *
 * The contract lives in the API package
 * (`mukti-api/src/contracts/stream-events.ts`) and is type-only, so importing
 * it here pulls nothing into the bundle.
 */
import type {
  ConversationStreamEventContract,
  NodeDialogueStreamEventContract,
} from '../../../mukti-api/src/contracts/stream-events';
import type { StreamEvent } from '../lib/hooks/use-conversation-stream';
import type { DialogueStreamEvent } from './dialogue.types';

export type ConversationStreamHasNoExtraTypes = Assert<
  Same<StreamEvent['type'], ConversationStreamEventContract['type']>
>;

// A failure below names the stream; hover the `SameByType` alias to see which
// event type disagrees.
export type ConversationStreamMatchesApi = Assert<
  AllTrue<SameByType<StreamEvent, ConversationStreamEventContract>>
>;

export type NodeDialogueStreamHasNoExtraTypes = Assert<
  Same<DialogueStreamEvent['type'], NodeDialogueStreamEventContract['type']>
>;

export type NodeDialogueStreamMatchesApi = Assert<
  AllTrue<SameByType<DialogueStreamEvent, NodeDialogueStreamEventContract>>
>;

type AllTrue<R> = R[keyof R] extends true ? true : false;
/** Fails to compile unless its argument is `true`. */
type Assert<T extends true> = T;
/** True only when A and B are mutually assignable. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** Per event type, compares the client and API shapes in both directions. */
type SameByType<Client extends { type: string }, Api extends { type: string }> = {
  [T in Api['type']]: Same<Extract<Client, { type: T }>, Extract<Api, { type: T }>>;
};
