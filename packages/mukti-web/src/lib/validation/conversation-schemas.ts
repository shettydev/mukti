/**
 * Conversation form validation schemas
 *
 * Centralized Zod schemas for all conversation forms.
 * These schemas enforce validation rules and provide
 * consistent validation across the application.
 */

import { z } from 'zod';

import type { SocraticTechnique } from '@/types/conversation.types';

/**
 * Valid Socratic techniques
 */
export const SOCRATIC_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'dialectic',
  'maieutics',
  'definitional',
  'analogical',
  'counterfactual',
];

/**
 * Technique descriptions for UI display
 */
export const TECHNIQUE_DESCRIPTIONS: Record<
  SocraticTechnique,
  { description: string; name: string }
> = {
  analogical: {
    description:
      'Uses comparisons and analogies to illuminate concepts and reveal hidden similarities.',
    name: 'Analogical',
  },
  counterfactual: {
    description: 'Explores "what if" scenarios to test assumptions and understand causality.',
    name: 'Counterfactual',
  },
  definitional: {
    description: 'Focuses on clarifying and refining definitions to achieve precise understanding.',
    name: 'Definitional',
  },
  dialectic: {
    description:
      'Engages in structured dialogue to synthesize opposing viewpoints into deeper truth.',
    name: 'Dialectic',
  },
  elenchus: {
    description:
      'Cross-examination method that exposes contradictions in beliefs through questioning.',
    name: 'Elenchus',
  },
  maieutics: {
    description: 'The "midwife" method that helps bring forth knowledge already within you.',
    name: 'Maieutics',
  },
};

/**
 * Technique validation schema
 */
export const techniqueSchema = z.enum([
  'elenchus',
  'dialectic',
  'maieutics',
  'definitional',
  'analogical',
  'counterfactual',
]);

/**
 * Title validation schema
 * - Required, non-empty
 * - Max 100 characters
 * - Trimmed whitespace
 */
export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(100, 'Title must be less than 100 characters')
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, 'Title cannot be only whitespace');

/**
 * Tag validation schema
 * - Non-empty string after trimming
 * - Max 30 characters
 */
export const tagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(30, 'Tag must be less than 30 characters')
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, 'Tag cannot be only whitespace');

/**
 * Tags array validation schema
 * - Array of valid tags
 * - Max 10 tags
 */
export const tagsSchema = z.array(tagSchema).max(10, 'Maximum 10 tags allowed');

/**
 * Create conversation form validation schema
 *
 * @example
 * ```typescript
 * const form = useForm<CreateConversationFormData>({
 *   resolver: zodResolver(createConversationSchema),
 * });
 * ```
 */
export const createConversationSchema = z.object({
  tags: tagsSchema,
  technique: techniqueSchema,
  title: titleSchema,
});

export type CreateConversationFormData = z.infer<typeof createConversationSchema>;

/**
 * Update conversation form validation schema
 *
 * All fields are optional for partial updates.
 *
 * @example
 * ```typescript
 * const form = useForm<UpdateConversationFormData>({
 *   resolver: zodResolver(updateConversationSchema),
 * });
 * ```
 */
export const updateConversationSchema = z.object({
  tags: z.array(tagSchema).max(10, 'Maximum 10 tags allowed').optional(),
  technique: techniqueSchema.optional(),
  title: titleSchema.optional(),
});

export type UpdateConversationFormData = z.infer<typeof updateConversationSchema>;

/**
 * Message content validation schema
 * - Required, non-empty
 * - Max 10000 characters
 * - Trimmed whitespace
 */
export const messageContentSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(10000, 'Message must be less than 10000 characters')
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, 'Message cannot be only whitespace');

/**
 * Helper function to validate message content
 *
 * @param content - Message content to validate
 * @returns true if valid, false otherwise
 */
export function isValidMessageContent(content: string): boolean {
  return messageContentSchema.safeParse(content).success;
}

/**
 * Helper function to validate tag
 *
 * @param tag - Tag to validate
 * @returns true if valid, false otherwise
 */
export function isValidTag(tag: string): boolean {
  return tagSchema.safeParse(tag).success;
}

/**
 * Helper function to validate title
 *
 * @param title - Title to validate
 * @returns true if valid, false otherwise
 */
export function isValidTitle(title: string): boolean {
  return titleSchema.safeParse(title).success;
}
