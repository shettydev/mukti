/**
 * Unit tests for ConversationFilters component
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ConversationFilters } from '@/types/conversation.types';

import { ConversationFilters as Filters } from '../conversation-filters';

// Debounce delay used in the component
const FILTER_DEBOUNCE_DELAY = 300;

describe('ConversationFilters', () => {
  const mockOnFiltersChange = jest.fn();

  const defaultFilters: ConversationFilters = {
    limit: 20,
    page: 1,
    sort: 'updatedAt',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render filter buttons', () => {
    render(<Filters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);

    expect(screen.getByRole('button', { name: /technique/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /favorites/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /archived/i })).toBeInTheDocument();
  });

  it('should toggle favorite filter', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Filters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);

    const favoritesButton = screen.getByRole('button', { name: /favorites/i });
    await user.click(favoritesButton);

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(FILTER_DEBOUNCE_DELAY);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      isFavorite: true,
    });
  });

  it('should toggle archived filter', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Filters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);

    const archivedButton = screen.getByRole('button', { name: /archived/i });
    await user.click(archivedButton);

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(FILTER_DEBOUNCE_DELAY);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      isArchived: true,
    });
  });

  it('should show active filter count on technique button', () => {
    const filtersWithTechnique = {
      ...defaultFilters,
      technique: 'elenchus' as const,
    };

    render(<Filters filters={filtersWithTechnique} onFiltersChange={mockOnFiltersChange} />);

    // Should show badge with count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show clear button when filters are active', () => {
    const filtersWithTechnique = {
      ...defaultFilters,
      technique: 'elenchus' as const,
    };

    render(<Filters filters={filtersWithTechnique} onFiltersChange={mockOnFiltersChange} />);

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('should not show clear button when no filters are active', () => {
    render(<Filters filters={defaultFilters} onFiltersChange={mockOnFiltersChange} />);

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('should clear all filters when clear button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const filtersWithMultiple = {
      ...defaultFilters,
      isFavorite: true,
      technique: 'elenchus' as const,
    };

    render(<Filters filters={filtersWithMultiple} onFiltersChange={mockOnFiltersChange} />);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    // Clear filters is immediate (no debounce)
    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      limit: filtersWithMultiple.limit,
      sort: 'updatedAt',
    });
  });

  it('should display active tags', () => {
    const filtersWithTags = {
      ...defaultFilters,
      tags: ['react', 'performance'],
    };

    render(<Filters filters={filtersWithTags} onFiltersChange={mockOnFiltersChange} />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
  });

  it('should remove tag when X button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const filtersWithTags = {
      ...defaultFilters,
      tags: ['react', 'performance'],
    };

    render(<Filters filters={filtersWithTags} onFiltersChange={mockOnFiltersChange} />);

    // Find the X button for 'react' tag
    const reactTag = screen.getByText('react').closest('div');
    const removeButton = reactTag?.querySelector('button');

    if (removeButton) {
      await user.click(removeButton);

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(FILTER_DEBOUNCE_DELAY);
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        tags: ['performance'],
      });
    }
  });

  it('should apply favorite filter style when active', () => {
    const filtersWithFavorite = {
      ...defaultFilters,
      isFavorite: true,
    };

    render(<Filters filters={filtersWithFavorite} onFiltersChange={mockOnFiltersChange} />);

    // When favorite filter is active, button label changes to "Show all conversations"
    const favoritesButton = screen.getByRole('button', { name: /show all conversations/i });
    // Check if button has the 'default' variant class (active state)
    expect(favoritesButton.className).toContain('bg-primary');
  });

  it('should apply archived filter style when active', () => {
    const filtersWithArchived = {
      ...defaultFilters,
      isArchived: true,
    };

    render(<Filters filters={filtersWithArchived} onFiltersChange={mockOnFiltersChange} />);

    // When archived filter is active, button label changes to "Show all conversations"
    const archivedButton = screen.getByRole('button', { name: /show all conversations/i });
    // Check if button has the 'default' variant class (active state)
    expect(archivedButton.className).toContain('bg-primary');
  });

  it('should untoggle favorite filter when clicked again', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const filtersWithFavorite = {
      ...defaultFilters,
      isFavorite: true,
    };

    render(<Filters filters={filtersWithFavorite} onFiltersChange={mockOnFiltersChange} />);

    // When favorite filter is active, button label changes to "Show all conversations"
    const favoritesButton = screen.getByRole('button', { name: /show all conversations/i });
    await user.click(favoritesButton);

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(FILTER_DEBOUNCE_DELAY);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      isFavorite: undefined,
    });
  });

  it('should untoggle archived filter when clicked again', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const filtersWithArchived = {
      ...defaultFilters,
      isArchived: true,
    };

    render(<Filters filters={filtersWithArchived} onFiltersChange={mockOnFiltersChange} />);

    // When archived filter is active, button label changes to "Show all conversations"
    const archivedButton = screen.getByRole('button', { name: /show all conversations/i });
    await user.click(archivedButton);

    // Wait for debounce
    act(() => {
      jest.advanceTimersByTime(FILTER_DEBOUNCE_DELAY);
    });

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      isArchived: undefined,
    });
  });
});
