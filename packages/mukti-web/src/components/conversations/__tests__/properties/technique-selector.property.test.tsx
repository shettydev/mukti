/**
 * Property-based tests for TechniqueSelector component
 *
 * **Feature: quick-chat-interface, Technique selector displays all options**
 *
 * For any state of the chat interface, clicking the technique selector
 * should display all 6 Socratic techniques with their descriptions.
 *
 *
 * **Feature: quick-chat-interface, Technique selection updates state**
 *
 * For any Socratic technique selected from the picker, the active technique
 * should update and be reflected in the UI.
 *
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';

import type { SocraticTechnique } from '@/types/conversation.types';

import { SOCRATIC_TECHNIQUES, TECHNIQUE_DESCRIPTIONS } from '@/lib/validation/conversation-schemas';

import { TechniqueSelector } from '../../technique-selector';

// All valid Socratic techniques
const VALID_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'dialectic',
  'maieutics',
  'definitional',
  'analogical',
  'counterfactual',
];

describe('Feature: quick-chat-interface, Technique selector displays all options', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Technique selector displays all options
   *
   * For any state of the chat interface (any selected technique or no selection),
   * clicking the technique selector should display all 6 Socratic techniques
   * with their descriptions.
   */
  it('should display all 6 techniques with descriptions when opened for any initial state', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(
        // Generate any valid technique or undefined (no selection)
        fc.option(fc.constantFrom(...VALID_TECHNIQUES), { nil: undefined }),
        async (selectedTechnique) => {
          cleanup();

          const mockOnChange = jest.fn();

          render(
            <TechniqueSelector onChange={mockOnChange} value={selectedTechnique ?? undefined} />
          );

          // Click the selector button to open the dialog
          const button = screen.getByRole('button', { name: /select socratic technique/i });
          await user.click(button);

          // Wait for dialog to open
          await waitFor(() => {
            expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
          });

          // Get the dialog content to scope queries
          const dialog = screen.getByRole('dialog');

          // Verify all 6 techniques are displayed
          expect(SOCRATIC_TECHNIQUES).toHaveLength(6);

          for (const technique of SOCRATIC_TECHNIQUES) {
            const info = TECHNIQUE_DESCRIPTIONS[technique];

            // Verify technique name is displayed within the dialog
            expect(within(dialog).getByText(info.name)).toBeInTheDocument();

            // Verify technique description is displayed within the dialog
            expect(within(dialog).getByText(info.description)).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * (continued): Each technique should be selectable
   *
   * For any technique displayed in the selector, clicking it should
   * call onChange with that technique.
   */
  it('should allow selection of any displayed technique', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(
        // Generate any valid technique to select
        fc.constantFrom(...VALID_TECHNIQUES),
        // Generate any initial state (selected or not)
        fc.option(fc.constantFrom(...VALID_TECHNIQUES), { nil: undefined }),
        async (techniqueToSelect, initialTechnique) => {
          cleanup();

          const mockOnChange = jest.fn();

          render(
            <TechniqueSelector onChange={mockOnChange} value={initialTechnique ?? undefined} />
          );

          // Click the selector button to open the dialog
          const button = screen.getByRole('button', { name: /select socratic technique/i });
          await user.click(button);

          // Wait for dialog to open
          await waitFor(() => {
            expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
          });

          // Get the dialog content to scope queries
          const dialog = screen.getByRole('dialog');

          // Get the technique info
          const info = TECHNIQUE_DESCRIPTIONS[techniqueToSelect];

          // Click on the technique option within the dialog
          const techniqueOption = within(dialog).getByText(info.name);
          await user.click(techniqueOption);

          // Verify onChange was called with the selected technique
          expect(mockOnChange).toHaveBeenCalledWith(techniqueToSelect);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * (continued): Technique count invariant
   *
   * For any state, the number of techniques displayed should always be exactly 6.
   */
  it('should always display exactly 6 technique options', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.constantFrom(...VALID_TECHNIQUES), { nil: undefined }),
        async (selectedTechnique) => {
          cleanup();

          const mockOnChange = jest.fn();

          render(
            <TechniqueSelector onChange={mockOnChange} value={selectedTechnique ?? undefined} />
          );

          // Click the selector button to open the dialog
          const button = screen.getByRole('button', { name: /select socratic technique/i });
          await user.click(button);

          // Wait for dialog to open
          await waitFor(() => {
            expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
          });

          // Count the technique options (they have role="option")
          const options = screen.getAllByRole('option');
          expect(options).toHaveLength(6);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  /**
   * (continued): Each technique has unique name and description
   *
   * For any technique in the list, its name and description should be unique.
   */
  it('should display unique names and descriptions for all techniques', () => {
    fc.assert(
      fc.property(fc.constant(SOCRATIC_TECHNIQUES), (techniques) => {
        // Verify all technique names are unique
        const names = techniques.map((t) => TECHNIQUE_DESCRIPTIONS[t].name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(techniques.length);

        // Verify all technique descriptions are unique
        const descriptions = techniques.map((t) => TECHNIQUE_DESCRIPTIONS[t].description);
        const uniqueDescriptions = new Set(descriptions);
        expect(uniqueDescriptions.size).toBe(techniques.length);
      }),
      { numRuns: 1 } // Only need to run once since SOCRATIC_TECHNIQUES is constant
    );
  });

  /**
   * (continued): Selected technique is visually indicated
   *
   * For any selected technique, it should have aria-selected="true".
   */
  it('should indicate the selected technique with aria-selected for any selection', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...VALID_TECHNIQUES), async (selectedTechnique) => {
        cleanup();

        const mockOnChange = jest.fn();

        render(<TechniqueSelector onChange={mockOnChange} value={selectedTechnique} />);

        // Click the selector button to open the dialog
        const button = screen.getByRole('button', { name: /select socratic technique/i });
        await user.click(button);

        // Wait for dialog to open
        await waitFor(() => {
          expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
        });

        // Find the selected option
        const selectedOption = screen.getByRole('option', { selected: true });
        expect(selectedOption).toBeInTheDocument();

        // Verify it contains the selected technique's name
        const info = TECHNIQUE_DESCRIPTIONS[selectedTechnique];
        expect(selectedOption).toHaveTextContent(info.name);
      }),
      { numRuns: 6 } // One for each technique
    );
  }, 30000);
});

/**
 * Feature: quick-chat-interface, Technique selection updates state
 *
 * For any Socratic technique selected from the picker, the active technique
 * should update and be reflected in the UI.
 *
 */
describe('Feature: quick-chat-interface, Technique selection updates state', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Technique selection updates state
   *
   * For any Socratic technique selected from the picker, the active technique
   * should update and be reflected in the UI (button text shows selected technique).
   */
  it('should update button text to show selected technique for any selection', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(
        // Generate initial technique
        fc.constantFrom(...VALID_TECHNIQUES),
        // Generate technique to select (different from initial)
        fc.constantFrom(...VALID_TECHNIQUES),
        async (initialTechnique, techniqueToSelect) => {
          cleanup();

          // Track state changes
          let currentTechnique = initialTechnique;
          const handleChange = (technique: SocraticTechnique) => {
            currentTechnique = technique;
          };

          const { rerender } = render(
            <TechniqueSelector onChange={handleChange} value={currentTechnique} />
          );

          // Verify initial state - button shows initial technique name
          const initialInfo = TECHNIQUE_DESCRIPTIONS[initialTechnique];
          const button = screen.getByRole('button', { name: /select socratic technique/i });
          expect(button).toHaveTextContent(initialInfo.name);

          // Open the dialog
          await user.click(button);

          // Wait for dialog to open
          await waitFor(() => {
            expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
          });

          // Select the new technique
          const dialog = screen.getByRole('dialog');
          const techniqueInfo = TECHNIQUE_DESCRIPTIONS[techniqueToSelect];
          const techniqueOption = within(dialog).getByText(techniqueInfo.name);
          await user.click(techniqueOption);

          // Verify state was updated
          expect(currentTechnique).toBe(techniqueToSelect);

          // Re-render with updated state (simulating parent component update)
          rerender(<TechniqueSelector onChange={handleChange} value={currentTechnique} />);

          // Verify UI reflects the new selection
          const updatedButton = screen.getByRole('button', { name: /select socratic technique/i });
          expect(updatedButton).toHaveTextContent(techniqueInfo.name);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * (continued): State update is immediate
   *
   * For any technique selection, the onChange callback should be called
   * immediately with the selected technique value.
   */
  it('should call onChange immediately with selected technique value', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...VALID_TECHNIQUES),
        fc.option(fc.constantFrom(...VALID_TECHNIQUES), { nil: undefined }),
        async (techniqueToSelect, initialTechnique) => {
          cleanup();

          const mockOnChange = jest.fn();

          render(
            <TechniqueSelector onChange={mockOnChange} value={initialTechnique ?? undefined} />
          );

          // Open the dialog
          const button = screen.getByRole('button', { name: /select socratic technique/i });
          await user.click(button);

          // Wait for dialog to open
          await waitFor(() => {
            expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
          });

          // Select the technique
          const dialog = screen.getByRole('dialog');
          const techniqueInfo = TECHNIQUE_DESCRIPTIONS[techniqueToSelect];
          const techniqueOption = within(dialog).getByText(techniqueInfo.name);
          await user.click(techniqueOption);

          // Verify onChange was called exactly once with the correct value
          expect(mockOnChange).toHaveBeenCalledTimes(1);
          expect(mockOnChange).toHaveBeenCalledWith(techniqueToSelect);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  /**
   * (continued): Dialog closes after selection
   *
   * For any technique selection, the dialog should close after selection,
   * allowing the user to see the updated state in the button.
   */
  it('should close dialog after selection to show updated state', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...VALID_TECHNIQUES), async (techniqueToSelect) => {
        cleanup();

        let currentTechnique: SocraticTechnique | undefined = undefined;
        const handleChange = (technique: SocraticTechnique) => {
          currentTechnique = technique;
        };

        const { rerender } = render(
          <TechniqueSelector onChange={handleChange} value={currentTechnique} />
        );

        // Open the dialog
        const button = screen.getByRole('button', { name: /select socratic technique/i });
        await user.click(button);

        // Wait for dialog to open
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        // Select the technique
        const dialog = screen.getByRole('dialog');
        const techniqueInfo = TECHNIQUE_DESCRIPTIONS[techniqueToSelect];
        const techniqueOption = within(dialog).getByText(techniqueInfo.name);
        await user.click(techniqueOption);

        // Re-render with updated state
        rerender(<TechniqueSelector onChange={handleChange} value={currentTechnique} />);

        // Verify dialog is closed
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        // Verify button shows the selected technique
        const updatedButton = screen.getByRole('button', { name: /select socratic technique/i });
        expect(updatedButton).toHaveTextContent(techniqueInfo.name);
      }),
      { numRuns: 10 }
    );
  }, 30000);
});
