<!-- Context: development/integration/openrouter-gemini | Priority: critical | Version: 1.0 | Updated: 2026-03-21 -->

# OpenRouter + Gemini Integration — Mukti AI

**Purpose**: How Mukti integrates with OpenRouter and Gemini for AI-powered Socratic responses

> Mukti does **NOT** use Mastra AI, LangChain, or any agent framework. AI calls are direct SDK calls.

---

## SDK Setup

```typescript
// OpenRouter
import { OpenRouter } from '@openrouter/sdk';

@Injectable()
export class OpenRouterClientFactory {
  create(apiKey: string): OpenRouter {
    return new OpenRouter({ apiKey });
  }
}

// Gemini
// GeminiClientFactory follows same pattern with @google/generative-ai SDK
```

Both factories are `@Injectable()` and provided in `AiModule`.

---

## BYOK (Bring Your Own Key)

Users can store their own OpenRouter or Gemini API keys, encrypted at rest.

```typescript
// AiSecretsService handles AES-256-GCM encryption/decryption
const encrypted = this.aiSecretsService.encryptString(apiKey); // Store in DB
const decrypted = this.aiSecretsService.decryptString(encrypted); // Use for requests

// Keys stored in User schema:
user.openRouterApiKeyEncrypted; // select: false — requires .select('+openRouterApiKeyEncrypted')
user.geminiApiKeyEncrypted; // select: false — same
user.openRouterApiKeyLast4; // Last 4 chars — shown in UI
```

---

## Model Resolution

`AiPolicyService.resolveEffectiveModel()` determines which model to use:

```
1. Candidate = requestedModel ?? userActiveModel ?? DEFAULT_MODEL ('openai/gpt-5-mini')
2. If NOT BYOK → must be in CURATED_MODELS list (currently: ['openai/gpt-5-mini'])
3. Always validate model exists on OpenRouter API
4. Return resolved model ID
```

```typescript
const effectiveModel = await this.aiPolicyService.resolveEffectiveModel({
  hasByok: !!user.openRouterApiKeyEncrypted,
  requestedModel: dto.model,
  userActiveModel: user.preferences?.activeModel,
  validationApiKey,
});
```

**Default model**: `openai/gpt-5-mini`  
**BYOK models**: Any model available on OpenRouter  
**Non-BYOK models**: Only curated list

---

## Key Resolution

```typescript
// In queue worker — resolveApiKey()
if (usedByok) {
  const user = await this.userModel.findById(userId).select('+openRouterApiKeyEncrypted').lean();
  return this.aiSecretsService.decryptString(user.openRouterApiKeyEncrypted!);
}
return this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
```

If `usedByok = true` but key is missing → throw `'OPENROUTER_KEY_MISSING'`  
If server key is missing → throw `'OPENROUTER_API_KEY not configured'`

---

## Sending a Completion

```typescript
// OpenRouterService
const response = await this.openRouterService.sendChatCompletion(
  messages, // ChatMessage[] built from technique template + history
  effectiveModel, // 'openai/gpt-5-mini' or BYOK model
  apiKey, // Server key or decrypted BYOK key
  techniqueTemplate
);
// response: { content, model, promptTokens, completionTokens, totalTokens, cost }
```

---

## Prompt Construction

`openRouterService.buildPrompt(template, messages, userMessage, scaffoldContext, qualityDirectives)` returns the full `ChatMessage[]` array:

1. System message from technique template (`techniqueDoc.template`)
2. Scaffold-level injection (RFC-0002 — augments system prompt with scaffold guardrails)
3. Quality directives (RFC-0004 — adds misconception correction context if detected)
4. Conversation history (trimmed `recentMessages`)
5. Current user message

---

## Usage Tracking

Every AI call logs a `UsageEvent` to MongoDB:

```typescript
await this.usageEventModel.create({
  eventType: 'QUESTION',
  metadata: { conversationId, model, tokens, cost, latencyMs, technique },
  timestamp: new Date(),
  userId,
});
```

---

## Env Vars

| Variable             | Required | Description                           |
| -------------------- | -------- | ------------------------------------- |
| `OPENROUTER_API_KEY` | Yes      | Server-side OpenRouter key (non-BYOK) |
| `OPENROUTER_API_KEY` | No       | Overridden per-user via BYOK          |

Bun auto-loads `.env` — no `dotenv` needed.

---

## Codebase References

- Factory: `packages/mukti-api/src/modules/ai/services/openrouter-client.factory.ts`
- Factory: `packages/mukti-api/src/modules/ai/services/gemini-client.factory.ts`
- Policy: `packages/mukti-api/src/modules/ai/services/ai-policy.service.ts`
- Secrets: `packages/mukti-api/src/modules/ai/services/ai-secrets.service.ts`
- Models: `packages/mukti-api/src/modules/ai/services/openrouter-models.service.ts`
- Chat completion: `packages/mukti-api/src/modules/conversations/services/openrouter.service.ts`
- AI Module: `packages/mukti-api/src/modules/ai/ai.module.ts`
