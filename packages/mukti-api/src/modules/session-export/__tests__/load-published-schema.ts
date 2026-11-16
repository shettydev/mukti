import { readFileSync } from 'fs';
import { join } from 'path';

import type { JsonSchema } from '../schema-validator';

/** The versioned schema researchers receive alongside the exports. */
export function loadPublishedSchema(): JsonSchema {
  return JSON.parse(
    readFileSync(
      join(
        __dirname,
        '../../../../../../docs/research/session-export.schema.json',
      ),
      'utf8',
    ),
  ) as JsonSchema;
}
