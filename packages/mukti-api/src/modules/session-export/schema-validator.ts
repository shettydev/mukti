/**
 * A minimal JSON Schema (draft-07 subset) validator for the published
 * session-export schema.
 *
 * @remarks
 * The change adds no dependencies, so this covers exactly the keywords the
 * schema uses: `type`, `enum`, `const`, `oneOf`, `required`, `properties`,
 * `additionalProperties: false`, `items`, `minimum` and local `$ref`. The
 * export tests and `scripts/eval/summarize.ts` both use it, so an export the
 * API writes and an export the summarizer accepts are judged the same way.
 * An unsupported keyword throws rather than being silently ignored.
 */

export interface JsonSchema {
  $ref?: string;
  [key: string]: unknown;
  additionalProperties?: boolean;
  const?: unknown;
  definitions?: Record<string, JsonSchema>;
  enum?: unknown[];
  items?: JsonSchema;
  minimum?: number;
  oneOf?: JsonSchema[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type?: string | string[];
}

const ANNOTATIONS = new Set([
  '$id',
  '$schema',
  'definitions',
  'description',
  'title',
]);
const SUPPORTED = new Set([
  '$ref',
  'additionalProperties',
  'const',
  'enum',
  'items',
  'minimum',
  'oneOf',
  'properties',
  'required',
  'type',
]);

/** Returns every violation as `path: problem`; empty when the value is valid. */
export function validateAgainstSchema(
  value: unknown,
  root: JsonSchema,
): string[] {
  const errors: string[] = [];
  check(value, root, root, '$', errors);
  return errors;
}

function check(
  value: unknown,
  schema: JsonSchema,
  root: JsonSchema,
  path: string,
  errors: string[],
): void {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key) && !ANNOTATIONS.has(key)) {
      throw new Error(`Unsupported schema keyword "${key}" at ${path}`);
    }
  }

  if (schema.$ref) {
    check(value, resolveRef(schema.$ref, root), root, path, errors);
    return;
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter(
      (option) => validateSub(value, option, root, path).length === 0,
    ).length;
    if (matches !== 1) {
      errors.push(`${path}: matches ${matches} oneOf options, expected 1`);
    }
    return;
  }

  if ('const' in schema && !deepEqual(value, schema.const)) {
    errors.push(`${path}: expected ${JSON.stringify(schema.const)}`);
    return;
  }

  if (schema.enum && !schema.enum.some((option) => deepEqual(value, option))) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of the allowed`);
    return;
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => hasType(value, t))) {
      errors.push(`${path}: expected ${types.join(' or ')}`);
      return;
    }
  }

  if (typeof value === 'number' && schema.minimum !== undefined) {
    if (value < schema.minimum) {
      errors.push(`${path}: below minimum ${schema.minimum}`);
    }
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) =>
      check(item, schema.items!, root, `${path}[${index}]`, errors),
    );
  }

  if (isObject(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        errors.push(`${path}: missing required "${key}"`);
      }
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, key)) {
        check(child, properties[key], root, `${path}.${key}`, errors);
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: unexpected property "${key}"`);
      }
    }
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasType(value: unknown, type: string): boolean {
  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'object':
      return isObject(value);
    case 'string':
      return typeof value === 'string';
    default:
      throw new Error(`Unsupported schema type "${type}"`);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveRef(ref: string, root: JsonSchema): JsonSchema {
  const prefix = '#/definitions/';
  const target = ref.startsWith(prefix)
    ? root.definitions?.[ref.slice(prefix.length)]
    : undefined;
  if (!target) {
    throw new Error(`Unresolvable schema reference "${ref}"`);
  }
  return target;
}

function validateSub(
  value: unknown,
  schema: JsonSchema,
  root: JsonSchema,
  path: string,
): string[] {
  const errors: string[] = [];
  check(value, schema, root, path, errors);
  return errors;
}
