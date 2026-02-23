export * from './archived-message.schema';
export * from './canvas-session.schema';
export * from './conversation.schema';
export * from './daily-usage-aggregate.schema';
export * from './dialogue-message.schema';
export * from './insight-node.schema';
export * from './node-dialogue.schema';
export * from './rate-limit.schema';
export * from './refresh-token.schema';
export * from './request-queue.schema';
export * from './resource.schema';
export * from './session.schema';
export * from './shared-link.schema';
export * from './subscription.schema';
export * from './technique.schema';
export * from './usage-event.schema';
// Export all schemas and their types for easy importing
export * from './user.schema';
export * from './vote.schema';
export * from './waitlist.schema';

import {
  ArchivedMessage,
  ArchivedMessageSchema,
} from './archived-message.schema';
import { CanvasSession, CanvasSessionSchema } from './canvas-session.schema';
import { Conversation, ConversationSchema } from './conversation.schema';
import {
  DailyUsageAggregate,
  DailyUsageAggregateSchema,
} from './daily-usage-aggregate.schema';
import {
  DialogueMessage,
  DialogueMessageSchema,
} from './dialogue-message.schema';
import { InsightNode, InsightNodeSchema } from './insight-node.schema';
import { NodeDialogue, NodeDialogueSchema } from './node-dialogue.schema';
import { RateLimit, RateLimitSchema } from './rate-limit.schema';
import { RefreshToken, RefreshTokenSchema } from './refresh-token.schema';
import { RequestQueue, RequestQueueSchema } from './request-queue.schema';
import { Resource, ResourceSchema } from './resource.schema';
import { Session, SessionSchema } from './session.schema';
import { SharedLink, SharedLinkSchema } from './shared-link.schema';
import { Subscription, SubscriptionSchema } from './subscription.schema';
import { Technique, TechniqueSchema } from './technique.schema';
import { UsageEvent, UsageEventSchema } from './usage-event.schema';
// Re-export commonly used types
import { User, UserSchema } from './user.schema';
import { Vote, VoteSchema } from './vote.schema';
import { Waitlist, WaitlistSchema } from './waitlist.schema';

// Array of all schemas for bulk registration
export const ALL_SCHEMAS = [
  { name: User.name, schema: UserSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: CanvasSession.name, schema: CanvasSessionSchema },
  { name: ArchivedMessage.name, schema: ArchivedMessageSchema },
  { name: DialogueMessage.name, schema: DialogueMessageSchema },
  { name: InsightNode.name, schema: InsightNodeSchema },
  { name: NodeDialogue.name, schema: NodeDialogueSchema },
  { name: Resource.name, schema: ResourceSchema },
  { name: Technique.name, schema: TechniqueSchema },
  { name: Vote.name, schema: VoteSchema },
  { name: SharedLink.name, schema: SharedLinkSchema },
  { name: UsageEvent.name, schema: UsageEventSchema },
  { name: DailyUsageAggregate.name, schema: DailyUsageAggregateSchema },
  { name: RequestQueue.name, schema: RequestQueueSchema },
  { name: RateLimit.name, schema: RateLimitSchema },
  { name: RefreshToken.name, schema: RefreshTokenSchema },
  { name: Session.name, schema: SessionSchema },
  { name: Waitlist.name, schema: WaitlistSchema },
];
