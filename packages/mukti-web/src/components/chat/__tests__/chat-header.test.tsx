/* eslint-disable @typescript-eslint/no-require-imports */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import type { Conversation, SocraticTechnique } from '@/types/conversation.types';

import { conversationsApi } from '@/lib/api/conversations';

import { ChatHeader } from '../chat-header';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/api/conversations', () => ({
  conversationsApi: {
    update: jest.fn(),
  },
}));

jest.mock('@/lib/hooks/use-conversations', () => ({
  useDeleteConversation: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

const mockConversation: Conversation = {
  createdAt: '2024-01-01T00:00:00Z',
  hasArchivedMessages: false,
  id: 'conv-123',
  isArchived: false,
  isFavorite: false,
  metadata: {
    estimatedCost: 0,
    messageCount: 0,
    totalTokens: 0,
  },
  recentMessages: [],
  tags: [],
  technique: 'elenchus' as SocraticTechnique,
  title: 'Test Conversation',
  updatedAt: '2024-01-01T00:00:01Z',
  userId: 'user-123',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ChatHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    const { useDeleteConversation } = require('@/lib/hooks/use-conversations');
    useDeleteConversation.mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    });
  });

  describe('Rendering', () => {
    it('should render "New Chat" when no conversation provided', () => {
      renderWithProviders(<ChatHeader conversation={null} />);

      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    it('should render conversation title when provided', () => {
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    });

    it('should show archived badge for archived conversations', () => {
      const archivedConversation = { ...mockConversation, isArchived: true };
      renderWithProviders(<ChatHeader conversation={archivedConversation} />);

      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('should render mobile menu toggle button', () => {
      const onMobileMenuToggle = jest.fn();
      renderWithProviders(
        <ChatHeader conversation={mockConversation} onMobileMenuToggle={onMobileMenuToggle} />
      );

      const toggleButton = screen.getByLabelText(/Toggle sidebar/i);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should not show options menu for new chat', () => {
      renderWithProviders(<ChatHeader conversation={null} />);

      const optionsButton = screen.queryByLabelText(/More options/i);
      expect(optionsButton).not.toBeInTheDocument();
    });

    it('should show options menu for existing conversation', () => {
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      expect(optionsButton).toBeInTheDocument();
    });
  });

  describe('Mobile Menu Toggle', () => {
    it('should call onMobileMenuToggle when toggle button clicked', async () => {
      const user = userEvent.setup();
      const onMobileMenuToggle = jest.fn();

      renderWithProviders(
        <ChatHeader conversation={mockConversation} onMobileMenuToggle={onMobileMenuToggle} />
      );

      const toggleButton = screen.getByLabelText(/Toggle sidebar/i);
      await user.click(toggleButton);

      expect(onMobileMenuToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Options Menu', () => {
    it('should open options popover when options button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      await waitFor(() => {
        expect(screen.getByText('Archive')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });

    it('should show "Restore" option for archived conversations', async () => {
      const user = userEvent.setup();
      const archivedConversation = { ...mockConversation, isArchived: true };
      renderWithProviders(<ChatHeader conversation={archivedConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      await waitFor(() => {
        expect(screen.getByText('Restore')).toBeInTheDocument();
      });
    });

    it('should show "Archive" option for active conversations', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      await waitFor(() => {
        expect(screen.getByText('Archive')).toBeInTheDocument();
      });
    });
  });

  describe('Archive/Restore', () => {
    it('should archive conversation when Archive clicked', async () => {
      const user = userEvent.setup();
      (conversationsApi.update as jest.Mock).mockResolvedValue({});

      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      const archiveButton = await screen.findByText('Archive');
      await user.click(archiveButton);

      await waitFor(() => {
        expect(conversationsApi.update).toHaveBeenCalledWith('conv-123', {
          isArchived: true,
        });
        expect(toast.success).toHaveBeenCalledWith('Conversation archived');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it('should restore conversation when Restore clicked', async () => {
      const user = userEvent.setup();
      const archivedConversation = { ...mockConversation, isArchived: true };
      (conversationsApi.update as jest.Mock).mockResolvedValue({});

      renderWithProviders(<ChatHeader conversation={archivedConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      const restoreButton = await screen.findByText('Restore');
      await user.click(restoreButton);

      await waitFor(() => {
        expect(conversationsApi.update).toHaveBeenCalledWith('conv-123', {
          isArchived: false,
        });
        expect(toast.success).toHaveBeenCalledWith('Conversation restored');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it('should show error toast when archive fails', async () => {
      const user = userEvent.setup();
      (conversationsApi.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      const archiveButton = await screen.findByText('Archive');
      await user.click(archiveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update conversation');
      });
    });
  });

  describe('Delete', () => {
    it('should open delete confirmation dialog when Delete clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      const deleteButton = await screen.findByText('Delete');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Delete conversation?')).toBeInTheDocument();
        expect(
          screen.getByText(/This will permanently delete "Test Conversation"/i)
        ).toBeInTheDocument();
      });
    });

    it('should close delete dialog when Cancel clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      // Open options menu
      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      // Click delete
      const deleteButton = await screen.findByText('Delete');
      await user.click(deleteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Delete conversation?')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('Delete conversation?')).not.toBeInTheDocument();
      });
    });

    it('should delete conversation when confirmed', async () => {
      const user = userEvent.setup();
      const mutate = jest.fn((id, options) => {
        options?.onSuccess?.();
      });

      const { useDeleteConversation } = require('@/lib/hooks/use-conversations');
      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate,
      });

      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      // Open options menu
      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      // Click delete
      const deleteButton = await screen.findByText('Delete');
      await user.click(deleteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Delete conversation?')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mutate).toHaveBeenCalledWith('conv-123', expect.any(Object));
        expect(toast.success).toHaveBeenCalledWith('Conversation deleted');
        expect(mockRouter.push).toHaveBeenCalledWith('/chat');
      });
    });

    it('should show error toast when delete fails', async () => {
      const user = userEvent.setup();
      const mutate = jest.fn((id, options) => {
        options?.onError?.();
      });

      const { useDeleteConversation } = require('@/lib/hooks/use-conversations');
      useDeleteConversation.mockReturnValue({
        isPending: false,
        mutate,
      });

      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      // Open options menu
      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      // Click delete
      const deleteButton = await screen.findByText('Delete');
      await user.click(deleteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Delete conversation?')).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete conversation');
      });
    });

    it('should disable delete button while deleting', async () => {
      const user = userEvent.setup();
      const { useDeleteConversation } = require('@/lib/hooks/use-conversations');
      useDeleteConversation.mockReturnValue({
        isPending: true,
        mutate: jest.fn(),
      });

      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      // Open options menu
      const optionsButton = screen.getByLabelText(/More options/i);
      await user.click(optionsButton);

      // Click delete
      const deleteButton = await screen.findByText('Delete');
      await user.click(deleteButton);

      // Wait for dialog
      await waitFor(() => {
        expect(screen.getByText('Delete conversation?')).toBeInTheDocument();
      });

      // Delete button should be disabled
      const confirmButton = screen.getByRole('button', { name: /Delete/i });
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const onMobileMenuToggle = jest.fn();
      renderWithProviders(
        <ChatHeader conversation={mockConversation} onMobileMenuToggle={onMobileMenuToggle} />
      );

      expect(screen.getByLabelText(/Toggle sidebar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/More options/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ChatHeader conversation={mockConversation} />);

      const optionsButton = screen.getByLabelText(/More options/i);

      // Tab to options button
      await user.tab();
      expect(optionsButton).toHaveFocus();

      // Open with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Archive')).toBeInTheDocument();
      });
    });
  });
});
