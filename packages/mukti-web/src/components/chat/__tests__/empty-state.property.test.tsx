/**
 * Property-based tests for EmptyState component
 *
 * **Property: Empty state shows centered layout**
 *
 * Tests that the empty state displays:
 * - Centered layout (vertically and horizontally)
 * - Quirky heading above the input
 * - Input bar for message entry
 */

import { cleanup, render, screen } from '@testing-library/react';
import * as fc from 'fast-check';

import type { SocraticTechnique } from '@/types/conversation.types';

import { EmptyState } from '../empty-state';

// Mock GSAP to avoid animation issues in tests
jest.mock('gsap', () => ({
  context: jest.fn(() => ({
    revert: jest.fn(),
  })),
  fromTo: jest.fn(),
  gsap: {
    context: jest.fn(() => ({
      revert: jest.fn(),
    })),
    fromTo: jest.fn(),
    to: jest.fn(),
  },
  to: jest.fn(),
}));

// Valid Socratic techniques
const VALID_TECHNIQUES: SocraticTechnique[] = [
  'elenchus',
  'maieutics',
  'dialectic',
  'definitional',
  'analogical',
  'counterfactual',
];

// Known quirky headings from the component
const QUIRKY_HEADINGS = [
  'The unexamined life is not worth living.',
  'Know thyself.',
  'Wonder is the beginning of wisdom.',
  'I cannot teach anybody anything. I can only make them think.',
  'Speak so that I may see you.',
  'To know, is to know that you know nothing.',
  'To find yourself, think for yourself.',
];

describe('EmptyState - Property Tests', () => {
  /**
   * Property: Empty state shows centered layout
   *
   * For any visit to /chat without a conversation ID, the system should
   * display the centered input with quirky heading and no navbar.
   *
   */
  describe('Property: Empty state shows centered layout', () => {
    const mockOnSendMessage = jest.fn().mockResolvedValue(undefined);
    const mockOnTechniqueChange = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      cleanup();
    });

    it('should always render a centered container for any valid technique', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          const { container } = render(
            <EmptyState
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // The main container should have centering classes
          const mainContainer = container.firstChild as HTMLElement;
          expect(mainContainer).toHaveClass('flex');
          expect(mainContainer).toHaveClass('items-center');
          expect(mainContainer).toHaveClass('justify-center');
        }),
        { numRuns: 6 } // One for each technique
      );
    });

    it('should always display a quirky heading from the predefined list', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          render(
            <EmptyState
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // Find the heading element
          const heading = screen.getByRole('heading', { level: 1 });
          expect(heading).toBeInTheDocument();

          // The heading text should be one of the quirky headings
          const headingText = heading.textContent || '';
          expect(QUIRKY_HEADINGS).toContain(headingText);
        }),
        { numRuns: 20 } // Run multiple times to test random heading selection
      );
    });

    it('should always render the message input textarea', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), fc.boolean(), (technique, isCreating) => {
          cleanup(); // Clean up before each property test iteration
          render(
            <EmptyState
              isCreating={isCreating}
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // The input should always be present
          const input = screen.getByRole('textbox', { name: /message input/i });
          expect(input).toBeInTheDocument();
          expect(input).toHaveAttribute('placeholder', 'Ask me anything...');
        }),
        { numRuns: 12 }
      );
    });

    it('should always render the send button', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          render(
            <EmptyState
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // The send button should always be present
          const sendButton = screen.getByRole('button', { name: /send message/i });
          expect(sendButton).toBeInTheDocument();
        }),
        { numRuns: 6 }
      );
    });

    it('should display technique selector label for any technique', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          render(
            <EmptyState
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // The technique selector label should be present
          const label = screen.getByText(/choose your inquiry method/i);
          expect(label).toBeInTheDocument();
        }),
        { numRuns: 6 }
      );
    });

    it('should render helper text with keyboard shortcuts', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          render(
            <EmptyState
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // Helper text should be present
          const helperText = screen.getByText(/press enter to send/i);
          expect(helperText).toBeInTheDocument();
        }),
        { numRuns: 6 }
      );
    });

    it('should have centered content container with max-width constraint', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          const { container } = render(
            <EmptyState
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          // Find the content container (child of main container)
          const contentContainer = container.querySelector('.max-w-2xl');
          expect(contentContainer).toBeInTheDocument();
        }),
        { numRuns: 6 }
      );
    });

    it('should disable input when isCreating is true', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_TECHNIQUES), (technique) => {
          cleanup(); // Clean up before each property test iteration
          render(
            <EmptyState
              isCreating
              onSendMessage={mockOnSendMessage}
              onTechniqueChange={mockOnTechniqueChange}
              selectedTechnique={technique}
            />
          );

          const input = screen.getByRole('textbox', { name: /message input/i });
          expect(input).toBeDisabled();
        }),
        { numRuns: 6 }
      );
    });
  });
});
