import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

import { SessionService } from '../auth/services/session.service';
import { TokenService } from '../auth/services/token.service';

interface Step {
  category: string;
  dependencies?: string[];
  field?: string;
  model: string;
  via?: string;
}
/** Explicit dependency edges preserve parent IDs after a failed child delete. */
export const DATA_PLAN: readonly Step[] = [
  { category: 'shareLinks', field: 'createdBy', model: 'SharedLink' },
  {
    category: 'thoughtMapShareLinks',
    field: 'createdBy',
    model: 'ThoughtMapShareLink',
  },
  {
    category: 'dialogueMessages',
    field: 'dialogueId',
    model: 'DialogueMessage',
    via: 'NodeDialogue',
  },
  {
    category: 'nodeDialogues',
    dependencies: ['DialogueMessage'],
    model: 'NodeDialogue',
  },
  {
    category: 'thoughtNodes',
    field: 'mapId',
    model: 'ThoughtNode',
    via: 'ThoughtMap',
  },
  {
    category: 'thoughtMaps',
    dependencies: ['ThoughtNode', 'NodeDialogue', 'ThoughtMapShareLink'],
    model: 'ThoughtMap',
  },
  {
    category: 'insightNodes',
    field: 'sessionId',
    model: 'InsightNode',
    via: 'CanvasSession',
  },
  {
    category: 'canvases',
    dependencies: ['InsightNode', 'NodeDialogue'],
    model: 'CanvasSession',
  },
  {
    category: 'archivedMessages',
    field: 'conversationId',
    model: 'ArchivedMessage',
    via: 'Conversation',
  },
  { category: 'queuedRequests', model: 'RequestQueue' },
  {
    category: 'conversations',
    dependencies: ['ArchivedMessage', 'SharedLink', 'RequestQueue'],
    model: 'Conversation',
  },
  { category: 'knowledgeStates', model: 'KnowledgeState' },
  { category: 'usageEvents', model: 'UsageEvent' },
  { category: 'dailyUsageAggregates', model: 'DailyUsageAggregate' },
  { category: 'votes', model: 'Vote' },
];
/** Data-only deletion keeps identity/settings and shared reference data. */
export const KEPT_SCHEMAS: Record<string, string> = {
  Concept: 'Shared reference data',
  RateLimit: 'Account quota, removed by account deletion',
  RefreshToken: 'Authentication, revoked and removed by account deletion',
  Resource: 'Shared reference data',
  Session: 'Authentication, revoked and removed by account deletion',
  Subscription: 'Account subscription, removed by account deletion',
  Technique: 'Shared reference data',
  User: 'Account and saved settings, removed by account deletion',
  Waitlist: 'Independent email waitlist, not linked to user IDs',
};
export interface DeletionResult {
  category: string;
  deletedCount: number;
  error?: string;
  success: boolean;
}
export interface UserDataDeletion {
  failedCategories: string[];
  outside: string[];
  results: DeletionResult[];
  success: boolean;
}

@Injectable()
export class UserDataService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
  ) {}

  async deleteAccount(userId: string): Promise<UserDataDeletion> {
    const data = await this.deleteAll(userId);
    if (!data.success) {
      return data;
    }
    // Keep the identity available for a retry until every dependent account record is gone.
    const results = data.results;
    const owner = new Types.ObjectId(userId);
    try {
      await this.tokens.revokeAllUserTokens(userId);
      await this.sessions.revokeAllSessions(userId);
      for (const model of [
        'RefreshToken',
        'Session',
        'Subscription',
        'RateLimit',
      ]) {
        const deleted = await this.connection
          .model(model)
          .deleteMany({ userId: owner });
        results.push({
          category: model,
          deletedCount: deleted.deletedCount,
          success: true,
        });
      }
      const deleted = await this.connection
        .model('User')
        .deleteMany({ _id: owner });
      results.push({
        category: 'account',
        deletedCount: deleted.deletedCount,
        success: true,
      });
    } catch {
      results.push({
        category: 'account',
        deletedCount: 0,
        error: 'Could not finish account deletion. Retry deletion.',
        success: false,
      });
    }
    return this.response(results);
  }

  async deleteAll(userId: string): Promise<UserDataDeletion> {
    const owner = new Types.ObjectId(userId);
    const results: DeletionResult[] = [];
    const failed = new Set<string>();
    // Ownership snapshots are loaded lazily, but always before their parent is deleted.
    const ids = new Map<string, Types.ObjectId[]>();
    const ownedIds = async (model: string): Promise<Types.ObjectId[]> => {
      if (ids.has(model)) {
        return ids.get(model)!;
      }
      // Direct ownership catches orphaned dialogues. Parent IDs also cover legacy
      // dialogues written before userId was populated.
      const filter =
        model === 'NodeDialogue'
          ? {
              $or: [
                { userId: owner },
                { sessionId: { $in: await ownedIds('CanvasSession') } },
                { mapId: { $in: await ownedIds('ThoughtMap') } },
              ],
            }
          : { userId: owner };
      const rows = await this.connection
        .model(model)
        .find(filter)
        .select('_id')
        .lean();
      const found = rows.map((row) => row._id as Types.ObjectId);
      ids.set(model, found);
      return found;
    };
    for (const step of DATA_PLAN) {
      try {
        if (step.dependencies?.some((dep) => failed.has(dep))) {
          throw new Error(
            'Blocked by a failed child category. Retry deletion.',
          );
        }
        const filter =
          step.model === 'NodeDialogue'
            ? { _id: { $in: await ownedIds('NodeDialogue') } }
            : step.via
              ? { [step.field!]: { $in: await ownedIds(step.via) } }
              : { [step.field ?? 'userId']: owner };
        const deleted = await this.connection
          .model(step.model)
          .deleteMany(filter);
        results.push({
          category: step.category,
          deletedCount: deleted.deletedCount,
          success: true,
        });
      } catch {
        failed.add(step.model);
        results.push({
          category: step.category,
          deletedCount: 0,
          error: step.dependencies?.some((dep) => failed.has(dep))
            ? 'Blocked by a failed child category. Retry deletion.'
            : 'Could not delete this category. Retry deletion.',
          success: false,
        });
      }
    }
    return this.response(results);
  }
  private response(results: DeletionResult[]): UserDataDeletion {
    const failedCategories = results
      .filter((result) => !result.success)
      .map((result) => result.category);
    return {
      failedCategories,
      outside: [],
      results,
      success: failedCategories.length === 0,
    };
  }
}
