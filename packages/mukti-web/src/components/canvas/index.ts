/**
 * Canvas components barrel export
 *
 * Exports all canvas-related components for the Thinking Canvas feature
 */

// Chat components
export { ChatInput, ChatMessage, DialogueHeader, NodeChatPanel } from './chat';
export type {
  ChatInputProps,
  ChatMessageProps,
  DialogueHeaderProps,
  InsightNodeData,
  NodeChatPanelProps,
} from './chat';

// Control components
export { CanvasLegend, NodePanel, ZoomControls } from './controls';

// Insight dialog
export { InsightNodeDialog } from './insight-node-dialog';
export type { InsightNodeDialogProps } from './insight-node-dialog';

// Node components
export { InsightNode, nodeTypes, RootNode, SeedNode, SoilNode } from './nodes';

// Wizard step components
export { ReviewStep } from './review-step';
export { RootsStep } from './roots-step';
export { SeedStep } from './seed-step';
export { SessionCard } from './session-card';
export { SetupWizardDialog } from './setup-wizard-dialog';
export { SoilStep } from './soil-step';

// Main canvas component
export { ThinkingCanvas } from './thinking-canvas';
export type { ThinkingCanvasProps } from './thinking-canvas';
