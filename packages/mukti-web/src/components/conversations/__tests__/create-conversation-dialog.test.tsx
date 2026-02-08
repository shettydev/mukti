/**
 * Unit tests for CreateConversationDialog component
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateConversationDialog } from '../create-conversation-dialog';

// Mock the useCreateConversation hook
const mockMutateAsync = jest.fn();
jest.mock('@/lib/hooks/use-conversations', () => ({
  useCreateConversation: () => ({
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

describe('CreateConversationDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockOnOpenChange.mockClear();
    mockOnSuccess.mockClear();
    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue({
      id: 'new-conversation-id',
      tags: [],
      technique: 'elenchus',
      title: 'Test Title',
    });
  });

  it('should render dialog when open', () => {
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Create New Conversation')).toBeInTheDocument();
  });

  it('should not render dialog when closed', () => {
    render(
      <CreateConversationDialog
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
        open={false}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Create New Conversation')).not.toBeInTheDocument();
  });

  it('should render form fields', () => {
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select socratic technique/i })).toBeInTheDocument();
    expect(screen.getByText(/tags \(optional\)/i)).toBeInTheDocument();
  });

  it('should auto-generate a title when title is left blank', async () => {
    const user = userEvent.setup();
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    // Select technique
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    await user.click(screen.getByText('Elenchus'));

    // Submit without title
    await user.click(screen.getByRole('button', { name: /create conversation/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        tags: [],
        technique: 'elenchus',
        title: 'New Elenchus conversation',
      });
    });
  });

  it('should show validation error when technique is not selected', async () => {
    const user = userEvent.setup();
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    // Fill title but not technique
    await user.type(screen.getByPlaceholderText(/what would you like to explore/i), 'Test Title');
    await user.click(screen.getByRole('button', { name: /create conversation/i }));

    await waitFor(() => {
      // Zod enum validation error - check for any error message in the technique field
      const errorMessages = screen
        .getAllByRole('paragraph')
        .filter((el) => el.getAttribute('data-slot') === 'form-message');
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('should call mutateAsync with form data on valid submission', async () => {
    const user = userEvent.setup();
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    // Fill form
    await user.type(screen.getByPlaceholderText(/what would you like to explore/i), 'Test Title');

    // Select technique
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    await user.click(screen.getByText('Elenchus'));

    // Submit
    await user.click(screen.getByRole('button', { name: /create conversation/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        tags: [],
        technique: 'elenchus',
        title: 'Test Title',
      });
    });
  });

  it('should close dialog on cancel', async () => {
    const user = userEvent.setup();
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should call onSuccess callback after successful creation', async () => {
    const user = userEvent.setup();
    render(
      <CreateConversationDialog onOpenChange={mockOnOpenChange} onSuccess={mockOnSuccess} open />,
      { wrapper: createWrapper() }
    );

    // Fill form
    await user.type(screen.getByPlaceholderText(/what would you like to explore/i), 'Test Title');
    await user.click(screen.getByRole('button', { name: /select socratic technique/i }));
    await user.click(screen.getByText('Elenchus'));

    // Submit
    await user.click(screen.getByRole('button', { name: /create conversation/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
