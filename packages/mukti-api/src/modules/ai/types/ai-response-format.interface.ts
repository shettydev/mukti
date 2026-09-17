/**
 * The response shape a calling surface expects, declared on every request.
 *
 * @remarks
 * Mukti's AI surfaces want two different things back. The Socratic conversation
 * and node dialogue are read by the learner and must be a question; thought-map
 * extraction, branch suggestion, concept extraction and misconception detection
 * are consumed by Mukti and must be the structure their parsers expect.
 * Constraining the second group to a question breaks it completely, and does so
 * without any error the provider can observe.
 *
 * The declaration says what the *surface* needs. How — or whether — a provider
 * enforces it is the provider's own business: a local agent CLI whose built-in
 * prompt cannot be replaced has only a schema to work with, while the hosted API
 * already carries the same intent in the system prompt. What no provider may do
 * is impose a shape the caller did not declare.
 *
 * The names and structure mirror `@openrouter/sdk`'s `responseFormat` (verified
 * against 0.1.27) so that a provider choosing to enforce forwards it without
 * translation, and so that only one name for the concept exists.
 */

/** JSON Schema plus its metadata, mirroring the SDK's `JSONSchemaConfig`. */
export interface AiJsonSchemaConfig {
  description?: string;
  name: string;
  schema?: Record<string, unknown>;
  strict?: boolean | null;
}

/** A declared shape, mirroring the SDK's `ResponseFormatJSONSchema`. */
export interface AiJsonSchemaResponseFormat {
  jsonSchema: AiJsonSchemaConfig;
  type: 'json_schema';
}

/**
 * A surface's response-shape declaration.
 *
 * @remarks
 * `undefined` is a deliberate value meaning "no shape required", not an
 * omission — which is why the request field carrying this is required rather
 * than optional. A surface that has not decided should not compile.
 */
export type AiResponseFormat = AiJsonSchemaResponseFormat | undefined;

/**
 * The shape shared by both learner-facing surfaces: one question, nothing else.
 *
 * @remarks
 * A schema offering no field for prose is the only constraint a coding-agent
 * CLI's built-in prompt cannot outrank — instruction alone can be, and was
 * measured to be, overridden. The `description` is kept terse deliberately: a
 * verbose one enumerating prohibitions was observed to inflate thinking tokens
 * roughly fivefold for a one-sentence answer.
 */
export const SOCRATIC_QUESTION_FORMAT: AiJsonSchemaResponseFormat = {
  jsonSchema: {
    description: 'A single Socratic question.',
    name: 'socratic_question',
    schema: {
      additionalProperties: false,
      properties: { question: { type: 'string' } },
      required: ['question'],
      type: 'object',
    },
    strict: true,
  },
  type: 'json_schema',
};
