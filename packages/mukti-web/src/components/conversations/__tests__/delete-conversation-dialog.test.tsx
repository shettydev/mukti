/**
 * Unit tests for DeleteConversationDialog component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeleteConversationDialog } from '../delete-conversation-dialog';

// Mock the useDeleteConversation hook
const mockMutateAsync = jest.fn();
jest.mock('@/lib/hooks/use-conversations', () => ({
  useDeleteConversation: () => ({
    isPending: false,
    mutateAsync: mockMutateAsync,
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
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

describe('DeleteConversationDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue(undefined);
  });

  it('should render dialog when open', () => {
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Delete Conversation')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open={false}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Delete Conversation')).not.toBeInTheDocument();
  });

  it('should display conversation title in confirmation message', () => {
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="My Important Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/"My Important Conversation"/)).toBeInTheDocument();
  });

  it('should display warning message', () => {
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('should close dialog on cancel', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call mutateAsync with conversation ID on delete', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConversationDialog
        conversationId="test-id-123"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('test-id-123');
    });
  });

  it('should call onSuccess callback after successful deletion', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful deletion', async () => {
    const user = userEvent.setup();
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should have destructive styling on delete button', () => {
    render(
      <DeleteConversationDialog
        conversationId="test-id"
        conversationTitle="Test Conversation"
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open
      />,
      { wrapper: createWrapper() }
    );

    const deleteButton = screen.getByRole('button', { name: /^delete$/i });
    // Check for destructive variant class
    expect(deleteButton).toHaveClass('bg-destructive');
  });
});
