/* eslint-disable @typescript-eslint/no-require-imports */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';

import { DashboardLayout, useLayout } from '../dashboard-layout';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/hooks/use-keyboard-shortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
}));

jest.mock('@/components/conversations', () => ({
  CreateConversationDialog: ({
    onSuccess,
    open,
  }: {
    onSuccess: (data: { id: string }) => void;
    open: boolean;
  }) =>
    open ? (
      <div data-testid="create-dialog">
        <button onClick={() => onSuccess({ id: 'new-conv-123' })} type="button">
          Create
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/dashboard/sidebar', () => ({
  MobileMenuButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="mobile-menu-button" onClick={onClick} type="button">
      Menu
    </button>
  ),
  Sidebar: ({
    collapsed,
    mobileOpen,
    onMobileClose,
    onToggleCollapse,
  }: {
    collapsed: boolean;
    mobileOpen: boolean;
    onMobileClose: () => void;
    onToggleCollapse: () => void;
  }) => (
    <div data-testid="sidebar">
      <div>Collapsed: {String(collapsed)}</div>
      <div>Mobile Open: {String(mobileOpen)}</div>
      <button data-testid="toggle-collapse" onClick={onToggleCollapse} type="button">
        Toggle
      </button>
      <button data-testid="close-mobile" onClick={onMobileClose} type="button">
        Close
      </button>
    </div>
  ),
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
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

describe('DashboardLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render children', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Test Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render page title in navbar', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('should render custom actions in navbar', () => {
      renderWithProviders(
        <DashboardLayout actions={<button type="button">Custom Action</button>} title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });

    it('should render sidebar by default', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should hide sidebar when showSidebar is false', () => {
      renderWithProviders(
        <DashboardLayout showSidebar={false} title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    });

    it('should render navbar by default', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should hide navbar when showNavbar is false', () => {
      renderWithProviders(
        <DashboardLayout showNavbar={false} title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    });

    it('should apply custom content className', () => {
      const { container } = renderWithProviders(
        <DashboardLayout contentClassName="custom-content" title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      const contentArea = container.querySelector('.custom-content');
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe('Sidebar State', () => {
    it('should initialize sidebar as expanded by default', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Collapsed: false')).toBeInTheDocument();
    });

    it('should load sidebar collapsed state from localStorage', () => {
      localStorage.setItem('mukti-sidebar-collapsed', 'true');

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      // Initial render might be false, but should update after hydration
      waitFor(() => {
        expect(screen.getByText('Collapsed: true')).toBeInTheDocument();
      });
    });

    it('should toggle sidebar collapse state', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      const toggleButton = screen.getByTestId('toggle-collapse');

      // Initially expanded
      expect(screen.getByText('Collapsed: false')).toBeInTheDocument();

      // Toggle to collapsed
      await user.click(toggleButton);
      expect(screen.getByText('Collapsed: true')).toBeInTheDocument();

      // Toggle back to expanded
      await user.click(toggleButton);
      expect(screen.getByText('Collapsed: false')).toBeInTheDocument();
    });

    it('should persist sidebar collapsed state to localStorage', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      const toggleButton = screen.getByTestId('toggle-collapse');

      await user.click(toggleButton);

      expect(localStorage.getItem('mukti-sidebar-collapsed')).toBe('true');
    });
  });

  describe('Mobile Menu', () => {
    it('should initialize mobile menu as closed', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByText('Mobile Open: false')).toBeInTheDocument();
    });

    it('should toggle mobile menu when button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      const menuButton = screen.getByTestId('mobile-menu-button');

      // Initially closed
      expect(screen.getByText('Mobile Open: false')).toBeInTheDocument();

      // Open menu
      await user.click(menuButton);
      expect(screen.getByText('Mobile Open: true')).toBeInTheDocument();

      // Close menu
      await user.click(menuButton);
      expect(screen.getByText('Mobile Open: false')).toBeInTheDocument();
    });

    it('should close mobile menu when close button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      const menuButton = screen.getByTestId('mobile-menu-button');
      const closeButton = screen.getByTestId('close-mobile');

      // Open menu
      await user.click(menuButton);
      expect(screen.getByText('Mobile Open: true')).toBeInTheDocument();

      // Close menu
      await user.click(closeButton);
      expect(screen.getByText('Mobile Open: false')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should register keyboard shortcuts', () => {
      const { useKeyboardShortcuts } = require('@/lib/hooks/use-keyboard-shortcuts');

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(useKeyboardShortcuts).toHaveBeenCalledWith(
        expect.objectContaining({
          onEscape: expect.any(Function),
          onNewConversation: expect.any(Function),
          onToggleSidebar: expect.any(Function),
        })
      );
    });

    it('should toggle sidebar on keyboard shortcut', () => {
      const { useKeyboardShortcuts } = require('@/lib/hooks/use-keyboard-shortcuts');
      let onToggleSidebar: () => void;

      useKeyboardShortcuts.mockImplementation(
        ({ onToggleSidebar: callback }: { onToggleSidebar: () => void }) => {
          onToggleSidebar = callback;
        }
      );

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      // Initially expanded
      expect(screen.getByText('Collapsed: false')).toBeInTheDocument();

      // Trigger keyboard shortcut
      onToggleSidebar!();

      waitFor(() => {
        expect(screen.getByText('Collapsed: true')).toBeInTheDocument();
      });
    });
  });

  describe('Create Conversation Dialog', () => {
    it('should not show dialog by default', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
    });

    it('should open dialog on keyboard shortcut', () => {
      const { useKeyboardShortcuts } = require('@/lib/hooks/use-keyboard-shortcuts');
      let onNewConversation: () => void;

      useKeyboardShortcuts.mockImplementation(
        ({ onNewConversation: callback }: { onNewConversation: () => void }) => {
          onNewConversation = callback;
        }
      );

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      // Trigger keyboard shortcut
      onNewConversation!();

      waitFor(() => {
        expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
      });
    });

    it('should navigate to new conversation on success', async () => {
      const user = userEvent.setup();
      const { useKeyboardShortcuts } = require('@/lib/hooks/use-keyboard-shortcuts');
      let onNewConversation: () => void;

      useKeyboardShortcuts.mockImplementation(
        ({ onNewConversation: callback }: { onNewConversation: () => void }) => {
          onNewConversation = callback;
        }
      );

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      // Open dialog
      onNewConversation!();

      await waitFor(() => {
        expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
      });

      // Create conversation
      const createButton = screen.getByText('Create');
      await user.click(createButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/chat/new-conv-123');
      });
    });

    it('should close dialog on Escape', () => {
      const { useKeyboardShortcuts } = require('@/lib/hooks/use-keyboard-shortcuts');
      let onNewConversation: () => void;
      let onEscape: () => void;

      useKeyboardShortcuts.mockImplementation(
        ({
          onEscape: escapeCallback,
          onNewConversation: newCallback,
        }: {
          onEscape: () => void;
          onNewConversation: () => void;
        }) => {
          onNewConversation = newCallback;
          onEscape = escapeCallback;
        }
      );

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      // Open dialog
      onNewConversation!();

      waitFor(() => {
        expect(screen.getByTestId('create-dialog')).toBeInTheDocument();
      });

      // Press Escape
      onEscape!();

      waitFor(() => {
        expect(screen.queryByTestId('create-dialog')).not.toBeInTheDocument();
      });
    });

    it('should close mobile menu on Escape when open', () => {
      const { useKeyboardShortcuts } = require('@/lib/hooks/use-keyboard-shortcuts');
      let onEscape: () => void;

      useKeyboardShortcuts.mockImplementation(({ onEscape: callback }: any) => {
        onEscape = callback;
      });

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      // Manually set mobile menu open
      const menuButton = screen.getByTestId('mobile-menu-button');
      menuButton.click();

      waitFor(() => {
        expect(screen.getByText('Mobile Open: true')).toBeInTheDocument();
      });

      // Press Escape
      onEscape!();

      waitFor(() => {
        expect(screen.getByText('Mobile Open: false')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Context', () => {
    it('should provide layout context to children', () => {
      function TestComponent() {
        const { state } = useLayout();
        return <div>Page Title: {state.pageTitle}</div>;
      }

      renderWithProviders(
        <DashboardLayout title="Test Page">
          <TestComponent />
        </DashboardLayout>
      );

      expect(screen.getByText('Page Title: Test Page')).toBeInTheDocument();
    });

    it('should update page title when prop changes', () => {
      function TestComponent() {
        const { state } = useLayout();
        return <div>Page Title: {state.pageTitle}</div>;
      }

      const { rerender } = renderWithProviders(
        <DashboardLayout title="Initial Title">
          <TestComponent />
        </DashboardLayout>
      );

      expect(screen.getByText('Page Title: Initial Title')).toBeInTheDocument();

      rerender(
        <QueryClientProvider client={createTestQueryClient()}>
          <DashboardLayout title="Updated Title">
            <TestComponent />
          </DashboardLayout>
        </QueryClientProvider>
      );

      expect(screen.getByText('Page Title: Updated Title')).toBeInTheDocument();
    });

    it('should throw error when useLayout used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      function TestComponent() {
        useLayout();
        return <div>Test</div>;
      }

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useLayout must be used within DashboardLayout');

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
    });

    it('should have proper heading hierarchy', () => {
      renderWithProviders(
        <DashboardLayout title="Test Page">
          <div>Content</div>
        </DashboardLayout>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Page');
    });
  });
});
