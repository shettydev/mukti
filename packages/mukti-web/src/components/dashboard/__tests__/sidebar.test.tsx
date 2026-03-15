import { render, screen } from '@testing-library/react';

import { Sidebar } from '../sidebar';

jest.mock('@/components/sidebar/conversation-list', () => ({
  ConversationList: () => <div data-testid="conversation-list">Conversation List</div>,
}));

jest.mock('@/components/sidebar/thought-map-list', () => ({
  ThoughtMapList: () => <div data-testid="thought-map-list">Thought Map List</div>,
}));

jest.mock('@/components/sidebar/user-profile-popover', () => ({
  UserProfilePopover: () => <div data-testid="user-profile">User Profile</div>,
}));

jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    logout: jest.fn(),
    user: {
      email: 'test@example.com',
      id: 'user-1',
      name: 'Test User',
    },
  }),
}));

describe('Sidebar', () => {
  it('shows only primary navigation icons when collapsed', () => {
    render(<Sidebar collapsed mobileOpen={false} />);

    expect(screen.getByRole('link', { name: 'New Chat' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thinking Canvas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Thought Maps' })).toBeInTheDocument();
    expect(screen.queryByTestId('thought-map-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('conversation-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
  });

  it('renders thought maps, conversation list, and profile when expanded', () => {
    render(<Sidebar collapsed={false} mobileOpen={false} />);

    expect(screen.getAllByText('Thought Maps')).toHaveLength(2);
    expect(screen.getByTestId('thought-map-list')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
  });
});
