/**
 * Unit tests for TechniqueSelector component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { SocraticTechnique } from '@/types/conversation.types';

import { TechniqueSelector } from '../technique-selector';

describe('TechniqueSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render with placeholder when no value selected', () => {
    render(<TechniqueSelector onChange={mockOnChange} />);

    expect(screen.getByText('Select a technique')).toBeInTheDocument();
  });

  it('should render selected technique name', () => {
    render(<TechniqueSelector onChange={mockOnChange} value="elenchus" />);

    expect(screen.getByText('Elenchus')).toBeInTheDocument();
  });

  it('should open dialog when button is clicked', async () => {
    const user = userEvent.setup();
    render(<TechniqueSelector onChange={mockOnChange} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Select Socratic Technique')).toBeInTheDocument();
  });

  it('should display all techniques with descriptions', async () => {
    const user = userEvent.setup();
    render(<TechniqueSelector onChange={mockOnChange} />);

    await user.click(screen.getByRole('button'));

    // Check all techniques are displayed
    expect(screen.getByText('Elenchus')).toBeInTheDocument();
    expect(screen.getByText('Dialectic')).toBeInTheDocument();
    expect(screen.getByText('Maieutics')).toBeInTheDocument();
    expect(screen.getByText('Definitional')).toBeInTheDocument();
    expect(screen.getByText('Analogical')).toBeInTheDocument();
    expect(screen.getByText('Counterfactual')).toBeInTheDocument();

    // Check descriptions are displayed
    expect(
      screen.getByText(/Cross-examination method that exposes contradictions/)
    ).toBeInTheDocument();
  });

  it('should call onChange when technique is selected', async () => {
    const user = userEvent.setup();
    render(<TechniqueSelector onChange={mockOnChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Dialectic'));

    expect(mockOnChange).toHaveBeenCalledWith('dialectic');
  });

  it('should close dialog after selection', async () => {
    const user = userEvent.setup();
    render(<TechniqueSelector onChange={mockOnChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Maieutics'));

    // Dialog should be closed
    expect(screen.queryByText('Select Socratic Technique')).not.toBeInTheDocument();
  });

  it('should show selected state for current technique', async () => {
    const user = userEvent.setup();
    render(<TechniqueSelector onChange={mockOnChange} value="elenchus" />);

    await user.click(screen.getByRole('button'));

    // The selected option should have aria-selected
    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<TechniqueSelector disabled onChange={mockOnChange} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should render all technique types correctly', () => {
    const techniques: SocraticTechnique[] = [
      'elenchus',
      'dialectic',
      'maieutics',
      'definitional',
      'analogical',
      'counterfactual',
    ];

    const expectedNames: Record<SocraticTechnique, string> = {
      analogical: 'Analogical',
      counterfactual: 'Counterfactual',
      definitional: 'Definitional',
      dialectic: 'Dialectic',
      elenchus: 'Elenchus',
      maieutics: 'Maieutics',
    };

    techniques.forEach((technique) => {
      const { unmount } = render(<TechniqueSelector onChange={mockOnChange} value={technique} />);
      expect(screen.getByText(expectedNames[technique])).toBeInTheDocument();
      unmount();
    });
  });
});
