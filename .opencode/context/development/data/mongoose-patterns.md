<!-- Context: development/data/mongoose-patterns | Priority: critical | Version: 1.0 | Updated: 2026-03-21 -->

# Mongoose Patterns — Mukti Data Layer

**Purpose**: Schema definition, registration, querying, and Mongoose conventions used in `@mukti/api`

---

## Schema Definition Pattern

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// 1. Type alias for typed model injection
export type UserDocument = Document & User;

// 2. Decorated class — collection name always explicit
@Schema({ collection: 'users', timestamps: true })
export class User {
  _id: Types.ObjectId; // Declare but don't decorate — virtual
  createdAt: Date; // Provided by timestamps: true
  updatedAt: Date;

  @Prop({ index: true, lowercase: true, required: true, trim: true, unique: true, type: String })
  email: string;

  // Sensitive fields: select: false keeps them out of default queries
  @Prop({ required: false, select: false, type: String })
  password?: string;

  // ObjectId reference
  @Prop({ ref: 'Subscription', type: Types.ObjectId })
  subscriptionId?: Types.ObjectId;
}

// 3. Schema factory
export const UserSchema = SchemaFactory.createForClass(User);

// 4. Extra indexes (compound / sparse)
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });

// 5. Virtuals
UserSchema.virtual('subscription', {
  foreignField: '_id',
  justOne: true,
  localField: 'subscriptionId',
  ref: 'Subscription',
});
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  },
});
UserSchema.set('toObject', { virtuals: true });
```

---

## ALL_SCHEMAS Registry

**Every** schema must be added to `packages/mukti-api/src/schemas/index.ts`:

```typescript
export const ALL_SCHEMAS = [
  { name: User.name, schema: UserSchema },
  { name: Conversation.name, schema: ConversationSchema },
  // ... all 24 schemas
];
```

`DatabaseModule` registers them all at once via `MongooseModule.forFeature(ALL_SCHEMAS)`.  
Individual modules add only the schemas they own via `MongooseModule.forFeature([...])`.

---

## Model Injection

```typescript
constructor(
  @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
) {}
```

---

## Query Patterns

```typescript
// Find with ownership check
const doc = await this.model.findOne({ _id: id, userId }).lean();
if (!doc) throw new NotFoundException(`Resource ${id} not found`);

// Select sensitive fields explicitly
const user = await this.userModel
  .findById(userId)
  .select('+openRouterApiKeyEncrypted +password')
  .lean();

// Paginated list
const [data, total] = await Promise.all([
  this.model
    .find(filter)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(),
  this.model.countDocuments(filter),
]);

// Atomic update
await this.model.updateOne({ _id: id }, { $set: { status: 'active' }, $inc: { messageCount: 1 } });

// Parallel queries
const [conversations, count] = await Promise.all([
  this.conversationModel.find({ userId }).lean(),
  this.conversationModel.countDocuments({ userId }),
]);
```

---

## Embedded Documents

Use TypeScript interfaces (not `@Schema`) for embedded sub-documents:

```typescript
// Interface only — embedded, not a collection
export interface ProblemStructure {
  roots: string[];
  seed: string;
  soil: string[];
}

// In parent schema:
@Prop({
  required: true,
  type: {
    roots: { required: true, type: [String] },
    seed:  { required: true, type: String },
    soil:  { default: [], type: [String] },
  },
})
problemStructure: ProblemStructure;
```

---

## Canvas Node ID Convention

Node IDs are **structural strings**, not UUIDs:

| Node Type | ID Format     | Examples                 |
| --------- | ------------- | ------------------------ |
| Seed      | `seed`        | `seed` (singleton)       |
| Soil      | `soil-{n}`    | `soil-0`, `soil-1`       |
| Root      | `root-{n}`    | `root-0`, `root-1`       |
| Insight   | `insight-{n}` | `insight-0`, `insight-1` |

Services parse these strings to determine node type for technique auto-selection.

---

## Schema Inventory (25 schemas)

**Domain core**: `User`, `Subscription`, `Conversation`, `CanvasSession`, `NodeDialogue`, `DialogueMessage`, `InsightNode`, `Concept`, `KnowledgeState`, `Technique`, `Vote`, `Resource`  
**Supporting**: `SharedLink`, `ThoughtMap`, `ThoughtNode`, `ThoughtMapShareLink`, `UsageEvent`, `DailyUsageAggregate`, `RequestQueue`, `RateLimit`, `RefreshToken`, `Session`, `ArchivedMessage`, `Waitlist`

**Key relationships**:

- `User` → `Subscription` (1:1, virtual populate)
- `User` → `Conversation[]` (1:many, `userId` field)
- `User` → `CanvasSession[]` (1:many, `userId` field)
- `CanvasSession` → `NodeDialogue[]` (1:many, unique on `sessionId + nodeId`)
- `Concept` → `Concept[]` (DAG via `prerequisites[]`)
- `KnowledgeState` → `User × Concept` (unique on `userId + conceptId`)

---

## Codebase References

- Schema index: `packages/mukti-api/src/schemas/index.ts`
- User schema example: `packages/mukti-api/src/schemas/user.schema.ts`
- Canvas schema (embedded docs): `packages/mukti-api/src/schemas/canvas-session.schema.ts`
- Schema directory: `packages/mukti-api/src/schemas/`
