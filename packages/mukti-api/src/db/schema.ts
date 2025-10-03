import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { relations } from 'drizzle-orm';

export const thinkingSessions = sqliteTable('thinking_sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  initialStatement: text('initial_statement').notNull(),
  status: text('status', {
    enum: ['initiated', 'in_progress', 'paused', 'completed', 'archived'],
  })
    .default('initiated')
    .notNull(),
  domain: text('domain').notNull(),
  complexity: text('complexity', {
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  })
    .default('intermediate')
    .notNull(),
  preferredTechnique: text('preferred_technique', {
    enum: ['elenchus', 'maieutics', 'dialectic', 'aporia', 'irony'],
  })
    .default('elenchus')
    .notNull(),
  urgency: text('urgency', { enum: ['low', 'medium', 'high'] })
    .default('medium')
    .notNull(),
  priorAttempts: text('prior_attempts', { mode: 'json' }).$type<string[]>(),
  learningGoals: text('learning_goals', { mode: 'json' }).$type<string[]>(),
  currentStage: text('current_stage'),
  completedStages: text('completed_stages', { mode: 'json' }).$type<string[]>(),
  insightsGenerated: integer('insights_generated').default(0).notNull(),
  questionsExplored: integer('questions_explored').default(0).notNull(),
  resourcesConsulted: integer('resources_consulted').default(0).notNull(),
  reflectionPoints: integer('reflection_points').default(0).notNull(),
  currentUnderstanding: text('current_understanding'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const problemCanvases = sqliteTable('problem_canvases', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sessionId: text('session_id')
    .notNull()
    .references(() => thinkingSessions.id),
  initialStatement: text('initial_statement').notNull(),
  coreIssue: text('core_issue'),
  subProblems: text('sub_problems', { mode: 'json' }).$type<string[]>(),
  constraints: text('constraints', { mode: 'json' }).$type<string[]>(),
  assumptions: text('assumptions', { mode: 'json' }).$type<string[]>(),
  stakeholders: text('stakeholders', { mode: 'json' }).$type<string[]>(),
  successCriteria: text('success_criteria', { mode: 'json' }).$type<string[]>(),
  assumptionMappings: text('assumption_mappings', { mode: 'json' }).$type<
    {
      assumption: string;
      confidence: number;
      impact: 'low' | 'medium' | 'high';
      validationMethod?: string;
      tested: boolean;
    }[]
  >(),
  domain: text('domain').notNull(),
  urgency: text('urgency', { enum: ['low', 'medium', 'high'] })
    .default('medium')
    .notNull(),
  priorAttempts: text('prior_attempts', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const inquiryPaths = sqliteTable('inquiry_paths', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sessionId: text('session_id')
    .notNull()
    .references(() => thinkingSessions.id),
  technique: text('technique', {
    enum: ['elenchus', 'maieutics', 'dialectic', 'aporia', 'irony'],
  })
    .default('elenchus')
    .notNull(),
  currentUnderstanding: text('current_understanding').notNull(),
  questions: text('questions', { mode: 'json' }).notNull().$type<string[]>(),
  explorationPaths: text('exploration_paths', { mode: 'json' }).$type<
    string[]
  >(),
  nextSteps: text('next_steps', { mode: 'json' }).$type<string[]>(),
  cognitiveLoad: text('cognitive_load', {
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  })
    .default('intermediate')
    .notNull(),
  userResponses: text('user_responses', { mode: 'json' }).$type<string[]>(),
  isCompleted: integer('is_completed', { mode: 'boolean' })
    .default(false)
    .notNull(),
  insightsGenerated: text('insights_generated'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const resourceCurations = sqliteTable('resource_curations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  inquiryPathId: text('inquiry_path_id').references(() => inquiryPaths.id),
  type: text('type', {
    enum: [
      'documentation',
      'interactive_guide',
      'video_tutorial',
      'article',
      'tool',
      'community_post',
      'code_example',
    ],
  })
    .default('documentation')
    .notNull(),
  title: text('title').notNull(),
  url: text('url'),
  description: text('description').notNull(),
  whyRelevant: text('why_relevant').notNull(),
  cognitiveLoad: text('cognitive_load', {
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  })
    .default('intermediate')
    .notNull(),
  estimatedTime: integer('estimated_time').default(10).notNull(),
  prerequisiteKnowledge: text('prerequisite_knowledge', {
    mode: 'json',
  }).$type<string[]>(),
  followUpResources: text('follow_up_resources', { mode: 'json' }).$type<
    string[]
  >(),
  context: text('context').notNull(),
  domain: text('domain').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  isValidated: integer('is_validated', { mode: 'boolean' })
    .default(false)
    .notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  effectivenessRating: real('effectiveness_rating').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const reflectionLogs = sqliteTable('reflection_logs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  sessionId: text('session_id')
    .notNull()
    .references(() => thinkingSessions.id),
  type: text('type', {
    enum: [
      'insight',
      'decision',
      'assumption_challenge',
      'pattern_recognition',
    ],
  }).notNull(),
  content: text('content').notNull(),
  confidence: integer('confidence').default(5).notNull(),
  impact: text('impact', { enum: ['low', 'medium', 'high'] })
    .default('medium')
    .notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>(),
  followUpQuestions: text('follow_up_questions'),
  actionItems: text('action_items'),
  relatedConcepts: text('related_concepts'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Relations
export const thinkingSessionsRelations = relations(
  thinkingSessions,
  ({ many }) => ({
    inquiryPaths: many(inquiryPaths),
    reflections: many(reflectionLogs),
    problemCanvases: many(problemCanvases),
  }),
);

export const problemCanvasesRelations = relations(
  problemCanvases,
  ({ one }) => ({
    session: one(thinkingSessions, {
      fields: [problemCanvases.sessionId],
      references: [thinkingSessions.id],
    }),
  }),
);

export const inquiryPathsRelations = relations(
  inquiryPaths,
  ({ one, many }) => ({
    session: one(thinkingSessions, {
      fields: [inquiryPaths.sessionId],
      references: [thinkingSessions.id],
    }),
    resources: many(resourceCurations),
  }),
);

export const resourceCurationsRelations = relations(
  resourceCurations,
  ({ one }) => ({
    inquiryPath: one(inquiryPaths, {
      fields: [resourceCurations.inquiryPathId],
      references: [inquiryPaths.id],
    }),
  }),
);

export const reflectionLogsRelations = relations(reflectionLogs, ({ one }) => ({
  session: one(thinkingSessions, {
    fields: [reflectionLogs.sessionId],
    references: [thinkingSessions.id],
  }),
}));
