/**
 * Property-based tests for TechniqueIndicator component
 *
 * **Feature: quick-chat-interface, Technique indicator displays current technique**
 *
 * For any active conversation, the technique indicator should display
 * the currently selected technique name.
 *
 */

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fc from 'fast-check';

import type { SocraticTechnique } from '@/types/conversation.types';

import { TooltipProvider } from '@/components/ui/tooltip';
import { SOCRATIC_TECHNIQUES, TECHNIQUE_DESCRIPTIONS } from '@/lib/validation/conversation-schemas';

import { TechniqueIndicator } from '../../technique-indicator';

// All valid Socratic techniques
const VALID_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'dialectic',
  'maieutics',
  'definitional',
  'analogical',
  'counterfactual',
];

/**
 * Helper to render TechniqueIndicator with required providers
 */
function renderTechniqueIndicator(technique: SocraticTechnique, className?: string) {
  return render(
    <TooltipProvider>
      <TechniqueIndicator className={className} technique={technique} />
    </TooltipProvider>
  );
}

describe('Feature: quick-chat-interface, Technique indicator displays current technique', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Technique indicator displays current technique
   *
   * For any Socratic technique, the indicator should display
   * the technique name correctly.
   */
  it('should display the correct technique name for any valid technique', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
        cleanup();

        renderTechniqueIndicator(technique);

        // Get the expected technique info
        const techniqueInfo = TECHNIQUE_DESCRIPTIONS[technique];

        // Verify the technique name is displayed
        expect(screen.getByText(techniqueInfo.name)).toBeInTheDocument();

        // Verify the "Technique:" label is displayed
        expect(screen.getByText('Technique:')).toBeInTheDocument();
      }),
      { numRuns: 6 } // One for each technique
    );
  });

  /**
   * (continued): Technique indicator shows tooltip on hover
   *
   * For any technique, hovering over the indicator should show
   * a tooltip with the technique description.
   */
  it('should show tooltip with technique description on hover for any technique', async () => {
    const user = userEvent.setup();

    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...VALID_TECHNIQUES), async (technique) => {
        cleanup();

        renderTechniqueIndicator(technique);

        const techniqueInfo = TECHNIQUE_DESCRIPTIONS[technique];

        // Find the button that triggers the tooltip
        const tooltipTrigger = screen.getByRole('button');
        expect(tooltipTrigger).toBeInTheDocument();

        // Hover over the trigger to show tooltip
        await user.hover(tooltipTrigger);

        // Wait for tooltip to appear and verify content
        const tooltip = await screen.findByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(tooltip).toHaveTextContent(techniqueInfo.name);
        expect(tooltip).toHaveTextContent(techniqueInfo.description);
      }),
      { numRuns: 6 } // One for each technique
    );
  }, 30000);

  /**
   * (continued): All techniques have valid display info
   *
   * For any technique in SOCRATIC_TECHNIQUES, there should be
   * corresponding display information in TECHNIQUE_DESCRIPTIONS.
   */
  it('should have display info for all valid techniques', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SOCRATIC_TECHNIQUES), (technique) => {
        // Verify technique has description info
        const info = TECHNIQUE_DESCRIPTIONS[technique];
        expect(info).toBeDefined();
        expect(info.name).toBeTruthy();
        expect(info.description).toBeTruthy();
        expect(typeof info.name).toBe('string');
        expect(typeof info.description).toBe('string');
      }),
      { numRuns: 6 }
    );
  });

  /**
   * (continued): Technique indicator is accessible
   *
   * For any technique, the indicator should have proper accessibility
   * attributes (button for tooltip trigger).
   */
  it('should have accessible button for tooltip trigger for any technique', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
        cleanup();

        renderTechniqueIndicator(technique);

        // Verify there's a button element for accessibility
        const button = screen.getByRole('button');
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('type', 'button');
      }),
      { numRuns: 6 }
    );
  });

  /**
   * (continued): Technique indicator accepts className prop
   *
   * For any technique and any className, the indicator should
   * apply the className to the container.
   */
  it('should apply custom className for any technique', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_TECHNIQUES),
        fc.constantFrom('custom-class', 'mt-4', 'flex-1', 'hidden md:flex'),
        (technique, className) => {
          cleanup();

          const { container } = renderTechniqueIndicator(technique, className);

          // Verify the className is applied to the container
          const indicatorContainer = container.firstChild as HTMLElement;
          expect(indicatorContainer).toHaveClass(className);
        }
      ),
      { numRuns: 12 }
    );
  });

  /**
   * (continued): Technique name matches TECHNIQUE_DESCRIPTIONS
   *
   * For any technique, the displayed name should exactly match
   * the name in TECHNIQUE_DESCRIPTIONS.
   */
  it('should display exact technique name from TECHNIQUE_DESCRIPTIONS', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
        cleanup();

        renderTechniqueIndicator(technique);

        const expectedName = TECHNIQUE_DESCRIPTIONS[technique].name;

        // Find the technique name element (it's a span with font-semibold)
        const nameElement = screen.getByText(expectedName);
        expect(nameElement).toBeInTheDocument();
        expect(nameElement.tagName.toLowerCase()).toBe('span');
      }),
      { numRuns: 6 }
    );
  });
});
