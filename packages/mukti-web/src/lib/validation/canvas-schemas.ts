/**
 * Canvas form validation schemas
 *
 * Centralized Zod schemas for the Thinking Canvas Setup Wizard.
 * These schemas enforce validation rules for problem structure
 * components: Seed, Soil, and Roots.
 */

import { z } from 'zod';

/**
 * Seed validation schema
 *
 * Validates the main problem statement:
 * - Required, non-empty
 * - Between 10 and 500 characters (after trimming)
 * - Cannot be only whitespace
 *
 * @example
 * ```typescript
 * const result = seedSchema.safeParse('My team is burned out');
 * ```
 */
export const seedSchema = z
  .string()
  .min(1, 'Problem statement is required')
  .transform((val) => val.trim())
  .refine((val) => val.length >= 10, {
    message: 'Problem statement must be at least 10 characters',
  })
  .refine((val) => val.length <= 500, {
    message: 'Problem statement must be less than 500 characters',
  });

/**
 * Soil item validation schema
 *
 * Validates individual context/constraint items:
 * - Between 5 and 200 characters (after trimming)
 * - Cannot be only whitespace
 *
 * @example
 * ```typescript
 * const result = soilItemSchema.safeParse('Budget is tight');
 * ```
 */
export const soilItemSchema = z
  .string()
  .min(1, 'Context item cannot be empty')
  .transform((val) => val.trim())
  .refine((val) => val.length >= 5, {
    message: 'Context item must be at least 5 characters',
  })
  .refine((val) => val.length <= 200, {
    message: 'Context item must be less than 200 characters',
  });

/**
 * Soil array validation schema
 *
 * Validates the array of context/constraint items:
 * - Minimum 0 items (optional)
 * - Maximum 10 items
 *
 * @example
 * ```typescript
 * const result = soilSchema.safeParse(['Budget is tight', 'Deadline in 2 weeks']);
 * ```
 */
export const soilSchema = z.array(soilItemSchema).max(10, 'Maximum 10 context items allowed');

/**
 * Roots item validation schema
 *
 * Validates individual assumption items:
 * - Between 5 and 200 characters (after trimming)
 * - Cannot be only whitespace
 *
 * @example
 * ```typescript
 * const result = rootsItemSchema.safeParse('We need to hire more people');
 * ```
 */
export const rootsItemSchema = z
  .string()
  .min(1, 'Assumption cannot be empty')
  .transform((val) => val.trim())
  .refine((val) => val.length >= 5, {
    message: 'Assumption must be at least 5 characters',
  })
  .refine((val) => val.length <= 200, {
    message: 'Assumption must be less than 200 characters',
  });

/**
 * Roots array validation schema
 *
 * Validates the array of assumption items:
 * - Minimum 1 item (required)
 * - Maximum 8 items
 *
 * @example
 * ```typescript
 * const result = rootsSchema.safeParse(['We need to hire more people']);
 * ```
 */
export const rootsSchema = z
  .array(rootsItemSchema)
  .min(1, 'At least one assumption is required')
  .max(8, 'Maximum 8 assumptions allowed');

/**
 * Complete problem structure validation schema
 *
 * Combines seed, soil, and roots into a complete problem structure.
 *
 * @example
 * ```typescript
 * const form = useForm<ProblemStructureFormData>({
 *   resolver: zodResolver(problemStructureSchema),
 * });
 * ```
 */
export const problemStructureSchema = z.object({
  roots: rootsSchema,
  seed: seedSchema,
  soil: soilSchema,
});

export type ProblemStructureFormData = z.infer<typeof problemStructureSchema>;

/**
 * Create canvas session DTO validation schema
 *
 * Same as problemStructureSchema, used for API requests.
 *
 * @example
 * ```typescript
 * const dto = createCanvasSessionSchema.parse({
 *   seed: 'My team is burned out',
 *   soil: ['Budget is tight', 'Deadline in 2 weeks'],
 *   roots: ['We need to hire more people'],
 * });
 * ```
 */
export const createCanvasSessionSchema = problemStructureSchema;

export type CreateCanvasSessionFormData = z.infer<typeof createCanvasSessionSchema>;

/**
 * Helper function to check if roots array can accept more items
 *
 * @param currentCount - Current number of roots items
 * @returns true if more items can be added
 */
export function canAddRootsItem(currentCount: number): boolean {
  return currentCount < 8;
}

/**
 * Helper function to check if soil array can accept more items
 *
 * @param currentCount - Current number of soil items
 * @returns true if more items can be added
 */
export function canAddSoilItem(currentCount: number): boolean {
  return currentCount < 10;
}

/**
 * Helper function to check if roots array meets minimum requirement
 *
 * @param currentCount - Current number of roots items
 * @returns true if minimum requirement is met
 */
export function hasMinimumRoots(currentCount: number): boolean {
  return currentCount >= 1;
}

/**
 * Helper function to validate roots item
 *
 * @param item - Roots item to validate
 * @returns true if valid, false otherwise
 */
export function isValidRootsItem(item: string): boolean {
  return rootsItemSchema.safeParse(item).success;
}

/**
 * Helper function to validate seed
 *
 * @param seed - Seed to validate
 * @returns true if valid, false otherwise
 */
export function isValidSeed(seed: string): boolean {
  return seedSchema.safeParse(seed).success;
}

/**
 * Helper function to validate soil item
 *
 * @param item - Soil item to validate
 * @returns true if valid, false otherwise
 */
export function isValidSoilItem(item: string): boolean {
  return soilItemSchema.safeParse(item).success;
}

/**
 * Constants for validation limits
 */
export const CANVAS_VALIDATION_LIMITS = {
  ROOTS_MAX_ITEMS: 8,
  ROOTS_MIN_ITEMS: 1,
  SEED_MAX_LENGTH: 500,
  SEED_MIN_LENGTH: 10,
  SOIL_ITEM_MAX_LENGTH: 200,
  SOIL_ITEM_MIN_LENGTH: 5,
  SOIL_MAX_ITEMS: 10,
  SOIL_MIN_ITEMS: 0,
} as const;
