/**
 * Canvas components barrel export
 *
 * Exports all canvas-related components for the Thinking Canvas feature
 */

// Node management dialogs
export { AddAssumptionDialog } from './add-assumption-dialog';
export type { AddAssumptionDialogProps } from './add-assumption-dialog';

export { AddContextDialog } from './add-context-dialog';

export type { AddContextDialogProps } from './add-context-dialog';
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
export { DeleteNodeDialog } from './delete-node-dialog';
export type { DeleteNodeDialogProps } from './delete-node-dialog';
export { InsightNodeDialog } from './insight-node-dialog';
export type { InsightNodeDialogProps } from './insight-node-dialog';
export { LinkConstraintDialog } from './link-constraint-dialog';
export type { LinkConstraintDialogProps } from './link-constraint-dialog';

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
