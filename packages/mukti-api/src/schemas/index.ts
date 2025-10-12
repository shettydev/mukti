export * from './archived-message.schema';
export * from './conversation.schema';
export * from './daily-usage-aggregate.schema';
export * from './rate-limit.schema';
export * from './request-queue.schema';
export * from './resource.schema';
export * from './shared-link.schema';
export * from './subscription.schema';
export * from './technique.schema';
export * from './usage-event.schema';
// Export all schemas and their types for easy importing
export * from './user.schema';
export * from './vote.schema';

import {
  ArchivedMessage,
  ArchivedMessageSchema,
} from './archived-message.schema';
import { Conversation, ConversationSchema } from './conversation.schema';
import {
  DailyUsageAggregate,
  DailyUsageAggregateSchema,
} from './daily-usage-aggregate.schema';
import { RateLimit, RateLimitSchema } from './rate-limit.schema';
import { RequestQueue, RequestQueueSchema } from './request-queue.schema';
import { Resource, ResourceSchema } from './resource.schema';
import { SharedLink, SharedLinkSchema } from './shared-link.schema';
import { Subscription, SubscriptionSchema } from './subscription.schema';
import { Technique, TechniqueSchema } from './technique.schema';
import { UsageEvent, UsageEventSchema } from './usage-event.schema';
// Re-export commonly used types
import { User, UserSchema } from './user.schema';
import { Vote, VoteSchema } from './vote.schema';

// Array of all schemas for bulk registration
export const ALL_SCHEMAS = [
  { name: User.name, schema: UserSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: ArchivedMessage.name, schema: ArchivedMessageSchema },
  { name: Resource.name, schema: ResourceSchema },
  { name: Technique.name, schema: TechniqueSchema },
  { name: Vote.name, schema: VoteSchema },
  { name: SharedLink.name, schema: SharedLinkSchema },
  { name: UsageEvent.name, schema: UsageEventSchema },
  { name: DailyUsageAggregate.name, schema: DailyUsageAggregateSchema },
  { name: RequestQueue.name, schema: RequestQueueSchema },
  { name: RateLimit.name, schema: RateLimitSchema },
];
