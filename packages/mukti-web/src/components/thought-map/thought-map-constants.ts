import { BookOpen, Bug, Compass, Scale } from 'lucide-react';

import type { ThinkingIntent } from '@/types/thought-map';

// ============================================================================
// Types
// ============================================================================

export interface ThinkingIntentMeta {
  description: string;
  icon: typeof Compass;
  label: string;
  placeholders: string[];
  value: ThinkingIntent;
}

// ============================================================================
// Constants
// ============================================================================

export const MAX_TITLE_LENGTH = 500;
export const PROMPT_CYCLE_MS = 6000;
export const PLACEHOLDER_CYCLE_MS = 4000;

export const SOCRATIC_PROMPTS = [
  "What's been occupying your mind lately?",
  'What problem keeps coming back unresolved?',
  'What do you wish you understood more deeply?',
  'What decision have you been putting off?',
  'What assumption are you quietly relying on?',
  'What feels true but might not be?',
  'Where does your thinking feel stuck?',
  'What question are you afraid to ask?',
];

export const THINKING_INTENTS: ThinkingIntentMeta[] = [
  {
    description: 'Map out a new idea or domain',
    icon: Compass,
    label: 'Explore',
    placeholders: [
      'e.g. What would my ideal morning routine look like?',
      'e.g. What does a meaningful friendship actually require?',
      'e.g. How could I redesign how I spend my weekends?',
      'e.g. What would learning look like if I had no deadlines?',
    ],
    value: 'explore',
  },
  {
    description: 'Weigh options and trade-offs',
    icon: Scale,
    label: 'Decide',
    placeholders: [
      'e.g. Should I change careers or stay where I am?',
      'e.g. Is it worth moving to a new city for this opportunity?',
      'e.g. Should I go back to school or learn on my own?',
      'e.g. Do I say yes to this commitment or protect my time?',
    ],
    value: 'decide',
  },
  {
    description: 'Build a mental model',
    icon: BookOpen,
    label: 'Understand',
    placeholders: [
      'e.g. Why do some habits stick and others don\u2019t?',
      'e.g. What actually makes a team work well together?',
      'e.g. How does compound interest really work?',
      'e.g. Why do I react differently under pressure?',
    ],
    value: 'understand',
  },
  {
    description: 'Find the root cause',
    icon: Bug,
    label: 'Debug',
    placeholders: [
      'e.g. Why do I keep avoiding this conversation?',
      'e.g. Why does this project feel stuck even though we\u2019re busy?',
      'e.g. What keeps going wrong with my sleep schedule?',
      'e.g. Why do I lose motivation halfway through things?',
    ],
    value: 'debug',
  },
];
