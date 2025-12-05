/**
 * Canvas components barrel export
 *
 * Exports all canvas-related components for the Thinking Canvas feature
 */

// Control components
export { CanvasLegend, NodePanel, ZoomControls } from './controls';

// Node components
export { nodeTypes, RootNode, SeedNode, SoilNode } from './nodes';

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
