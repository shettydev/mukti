/**
 * Unit tests for UpdateConversationDialog component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Conversation } from '@/types/conversation.types';

import { UpdateConversationDialog } from '../update-conversation-dialog';

// Mock the useUpdateConversation hook
const mockMutateAsync = jest.fn();
jest.mock('@/lib/hooks/use-conversations', () => ({
  useUpdateConversation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockConversation: Conversation = {
  createdAt: '2024-01-01T00:00:00Z',
  hasArchivedMessages: false,
  id: 'test-id-123',
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0.05,
    lastMessageAt: '2024-01-15T12:00:00Z',
    messageCount: 5,
    totalTokens: 1000,
  },
  recentMessages: [],
  tags: ['react', 'performance'],
  technique: 'elenchus',
  title: 'Test Conversation',
  updatedAt: '2024-01-15T12:00:00Z',
  userId: 'user-123',
};

describe('UpdateConversationDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue({
      ...mockConversation,
      title: 'Updated Title',
    });
  });

  it('should render dialog when open', () => {
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Edit Conversation')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open={false}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Edit Conversation')).not.toBeInTheDocument();
  });

  it('should populate form with existing conversation data', () => {
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByDisplayValue('Test Conversation')).toBeInTheDocument();
    expect(screen.getByText('Elenchus')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('performance')).toBeInTheDocument();
  });

  it('should show validation error for empty title', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Clear the title
    const titleInput = screen.getByDisplayValue('Test Conversation');
    await user.clear(titleInput);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('should call mutateAsync with only changed fields', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Change only the title
    const titleInput = screen.getByDisplayValue('Test Conversation');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Updated Title',
      });
    });
  });

  it('should close dialog on cancel', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should close dialog without calling mutateAsync when no changes made', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Submit without making changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should show technique change confirmation when conversation has messages', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Click technique selector
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    // Select a different technique
    await user.click(screen.getByText('Dialectic'));

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Change Technique?')).toBeInTheDocument();
    });
  });

  it('should not show technique change confirmation when conversation has no messages', async () => {
    const user = userEvent.setup();
    const emptyConversation = {
      ...mockConversation,
      metadata: { ...mockConversation.metadata, messageCount: 0 },
    };

    render(
      <UpdateConversationDialog
        conversation={emptyConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Click technique selector
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    // Select a different technique
    await user.click(screen.getByText('Dialectic'));

    // Should NOT show confirmation dialog
    expect(screen.queryByText('Change Technique?')).not.toBeInTheDocument();
  });

  it('should apply technique change after confirmation', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Click technique selector and select different technique
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    await user.click(screen.getByText('Dialectic'));

    // Confirm the change
    await user.click(screen.getByRole('button', { name: /change technique/i }));

    // Submit the form
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          technique: 'dialectic',
        })
      );
    });
  });

  it('should cancel technique change when Keep Current is clicked', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Click technique selector and select different technique
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    await user.click(screen.getByText('Dialectic'));

    // Cancel the change
    await user.click(screen.getByRole('button', { name: /keep current/i }));

    // Technique should still be the original
    expect(screen.getByText('Elenchus')).toBeInTheDocument();
  });

  it('should call onSuccess callback after successful update', async () => {
    const user = userEvent.setup();
    render(
      <UpdateConversationDialog
        conversation={mockConversation}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    // Change title
    const titleInput = screen.getByDisplayValue('Test Conversation');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
