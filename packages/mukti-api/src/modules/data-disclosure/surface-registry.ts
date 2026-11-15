/**
 * Every model-calling surface's disclosure descriptor, collected from the
 * files that make the calls (data-flow-disclosure).
 *
 * @remarks
 * Its spec fails when a class that injects the AI client factory has no
 * descriptor, or when a stated history window is not the constant its call
 * site reads. Add the descriptor beside the new call, then list it here.
 */
import type {
  DeploymentMode,
  DisclosureDescriptor,
} from './disclosure-descriptor';

import { CHAT_DISCLOSURE } from '../conversations/services/message.service';
import { MISCONCEPTION_DISCLOSURE } from '../dialogue-quality/services/misconception-detector.service';
import { CANVAS_NODE_DISCLOSURE } from '../dialogue/services/dialogue-queue.service';
import { CONCEPT_EXTRACTION_DISCLOSURE } from '../scaffolding/services/knowledge-gap-detector.service';
import { BRANCH_SUGGESTION_DISCLOSURE } from '../thought-map/services/branch-suggestion.service';
import { THOUGHT_MAP_EXTRACTION_DISCLOSURE } from '../thought-map/services/map-extraction.service';
import { THOUGHT_MAP_NODE_DISCLOSURE } from '../thought-map/services/thought-map-dialogue-queue.service';

/** In the order the disclosure lists them: dialogues, then auxiliary calls. */
export const SURFACE_DESCRIPTORS: readonly DisclosureDescriptor[] = [
  CHAT_DISCLOSURE,
  CANVAS_NODE_DISCLOSURE,
  THOUGHT_MAP_NODE_DISCLOSURE,
  CONCEPT_EXTRACTION_DISCLOSURE,
  MISCONCEPTION_DISCLOSURE,
  THOUGHT_MAP_EXTRACTION_DISCLOSURE,
  BRANCH_SUGGESTION_DISCLOSURE,
];

/** The surfaces that call a model in a deployment mode. */
export function surfacesFor(mode: DeploymentMode): DisclosureDescriptor[] {
  return SURFACE_DESCRIPTORS.filter((d) => d.runsIn.includes(mode));
}
