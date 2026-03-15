import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateThoughtMapDialog } from '../CreateThoughtMapDialog';

const mockMutateAsync = jest.fn();

jest.mock('@/lib/hooks/use-thought-map', () => ({
  useCreateThoughtMap: () => ({
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

describe('CreateThoughtMapDialog', () => {
  const onOpenChange = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      createdAt: new Date().toISOString(),
      id: 'map-1',
      nodeCount: 1,
      rootNodeId: 'topic-0',
      settings: {
        autoSuggestEnabled: true,
        autoSuggestIdleSeconds: 10,
        maxSuggestionsPerNode: 4,
      },
      status: 'active',
      title: 'How should I design my database schema?',
      updatedAt: new Date().toISOString(),
      userId: 'user-1',
    });
  });

  it('renders the topic-first creation prompt', () => {
    render(<CreateThoughtMapDialog onOpenChange={onOpenChange} onSuccess={onSuccess} open />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('New Thought Map')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/how should i design my database schema/i)
    ).toBeInTheDocument();
  });

  it('creates a map from the entered topic', async () => {
    const user = userEvent.setup();

    render(<CreateThoughtMapDialog onOpenChange={onOpenChange} onSuccess={onSuccess} open />, {
      wrapper: createWrapper(),
    });

    await user.type(screen.getByLabelText(/topic/i), 'How should I design my database schema?');
    await user.click(screen.getByRole('button', { name: /create thought map/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'How should I design my database schema?',
      });
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows inline creation errors', async () => {
    const user = userEvent.setup();

    mockMutateAsync.mockRejectedValueOnce(new Error('Creation failed'));

    render(<CreateThoughtMapDialog onOpenChange={onOpenChange} onSuccess={onSuccess} open />, {
      wrapper: createWrapper(),
    });

    await user.type(screen.getByLabelText(/topic/i), 'Test topic');
    await user.click(screen.getByRole('button', { name: /create thought map/i }));

    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument();
    });
  });
});
