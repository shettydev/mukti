/**
 * Wizard store using Zustand
 * Manages the state for the Thinking Canvas Setup Wizard
 *
 * @remarks
 * - Handles navigation between wizard steps
 * - Preserves data when navigating back and forward
 * - Provides actions for managing seed, soil, and roots data
 */

import { create } from 'zustand';

/**
 * Wizard step type representing the four steps of the setup wizard
 */
export type WizardStep = 'review' | 'roots' | 'seed' | 'soil';

/**
 * Order of wizard steps for navigation
 */
const STEP_ORDER: WizardStep[] = ['seed', 'soil', 'roots', 'review'];

/**
 * Wizard state interface
 * @property currentStep - Current wizard step
 * @property roots - Core assumptions (1-8 items, 5-200 chars each)
 * @property seed - The main problem statement (10-500 chars)
 * @property soil - Context and constraints (0-10 items, 5-200 chars each)
 */
interface WizardState {
  // Actions
  addRootsItem: (item: string) => void;
  addSoilItem: (item: string) => void;
  // Navigation
  currentStep: WizardStep;
  nextStep: () => void;
  prevStep: () => void;
  removeRootsItem: (index: number) => void;
  removeSoilItem: (index: number) => void;
  reset: () => void;
  // Data
  roots: string[];

  seed: string;

  setSeed: (seed: string) => void;
  setStep: (step: WizardStep) => void;
  soil: string[];
}

/**
 * Initial state for the wizard
 */
const initialState = {
  currentStep: 'seed' as WizardStep,
  roots: [] as string[],
  seed: '',
  soil: [] as string[],
};

/**
 * Wizard store for managing the Thinking Canvas Setup Wizard state
 *
 * @example
 * ```typescript
 * const { seed, setSeed, nextStep } = useWizardStore();
 *
 * // Set the problem statement
 * setSeed('My team is burned out');
 *
 * // Navigate to next step
 * nextStep();
 * ```
 */
export const useWizardStore = create<WizardState>()((set) => ({
  ...initialState,

  /**
   * Add a roots item (assumption)
   * @param item - The assumption to add
   */
  addRootsItem: (item) =>
    set((state) => ({
      roots: [...state.roots, item],
    })),

  /**
   * Add a soil item (context/constraint)
   * @param item - The context item to add
   */
  addSoilItem: (item) =>
    set((state) => ({
      soil: [...state.soil, item],
    })),

  /**
   * Navigate to the next step in the wizard
   * Does nothing if already on the last step
   */
  nextStep: () =>
    set((state) => {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      const nextIndex = currentIndex + 1;

      if (nextIndex < STEP_ORDER.length) {
        return { currentStep: STEP_ORDER[nextIndex] };
      }

      return state;
    }),

  /**
   * Navigate to the previous step in the wizard
   * Does nothing if already on the first step
   */
  prevStep: () =>
    set((state) => {
      const currentIndex = STEP_ORDER.indexOf(state.currentStep);
      const prevIndex = currentIndex - 1;

      if (prevIndex >= 0) {
        return { currentStep: STEP_ORDER[prevIndex] };
      }

      return state;
    }),

  /**
   * Remove a roots item by index
   * @param index - The index of the item to remove
   */
  removeRootsItem: (index) =>
    set((state) => ({
      roots: state.roots.filter((_, i) => i !== index),
    })),

  /**
   * Remove a soil item by index
   * @param index - The index of the item to remove
   */
  removeSoilItem: (index) =>
    set((state) => ({
      soil: state.soil.filter((_, i) => i !== index),
    })),

  /**
   * Reset the wizard to its initial state
   * Used when closing the wizard or after successful submission
   */
  reset: () => set(initialState),

  /**
   * Set the seed (problem statement)
   * @param seed - The problem statement text
   */
  setSeed: (seed) => set({ seed }),

  /**
   * Set the current step directly
   * @param step - The step to navigate to
   */
  setStep: (step) => set({ currentStep: step }),
}));

/**
 * Selector hooks for better performance
 * Use these instead of accessing the full store when only specific values are needed
 */

export const useCurrentStep = () => useWizardStore((state) => state.currentStep);
export const useRoots = () => useWizardStore((state) => state.roots);
export const useSeed = () => useWizardStore((state) => state.seed);
export const useSoil = () => useWizardStore((state) => state.soil);

/**
 * Get the problem structure for submission
 * @returns Object containing seed, soil, and roots
 */
export const useProblemStructure = () =>
  useWizardStore((state) => ({
    roots: state.roots,
    seed: state.seed,
    soil: state.soil,
  }));
