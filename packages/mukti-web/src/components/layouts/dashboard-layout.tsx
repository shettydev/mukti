'use client';

import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

import type { DashboardLayoutProps, LayoutState } from '@/types/layout.types';

import { CreateConversationDialog } from '@/components/conversations';
import { MobileMenuButton, Sidebar } from '@/components/dashboard/sidebar';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { cn } from '@/lib/utils';

/**
 * Layout context value
 * @property {LayoutState} state - Current layout state
 * @property {() => void} toggleMobileMenu - Toggle mobile menu
 * @property {() => void} toggleSidebar - Toggle sidebar collapse
 * @property {(updates: Partial<LayoutState>) => void} updateState - Update layout state
 */
interface LayoutContextValue {
  state: LayoutState;
  toggleMobileMenu: () => void;
  toggleSidebar: () => void;
  updateState: (updates: Partial<LayoutState>) => void;
}

/**
 * Layout context for managing dashboard layout state
 */
const LayoutContext = createContext<LayoutContextValue | null>(null);

/**
 * Reusable dashboard layout component
 *
 * Provides consistent structure with sidebar, navbar, and content area.
 * Handles mobile responsiveness, sidebar collapse state, and keyboard shortcuts.
 *
 * Features:
 * - Responsive sidebar (drawer on mobile, fixed on desktop)
 * - Collapsible sidebar on desktop
 * - Navbar with page title and actions
 * - Keyboard shortcut integration (Cmd/Ctrl+B for sidebar toggle)
 * - Consistent spacing and styling
 * - Layout state management with React Context
 *
 * @example
 * ```tsx
 * <DashboardLayout title="Conversations" actions={<Button>New</Button>}>
 *   <ConversationList />
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({
  actions,
  children,
  contentClassName,
  showNavbar = true,
  showSidebar = true,
  title,
}: DashboardLayoutProps) {
  const router = useRouter();

  // Layout state
  const [state, setState] = useState<LayoutState>({
    mobileMenuOpen: false,
    pageTitle: title || '',
    sidebarCollapsed: false,
  });

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Update page title when prop changes
  useEffect(() => {
    setState((prev) => ({ ...prev, pageTitle: title || '' }));
  }, [title]);

  // State management functions
  const toggleSidebar = () => {
    setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  };

  const toggleMobileMenu = () => {
    setState((prev) => ({ ...prev, mobileMenuOpen: !prev.mobileMenuOpen }));
  };

  const updateState = (updates: Partial<LayoutState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const closeMobileMenu = () => {
    setState((prev) => ({ ...prev, mobileMenuOpen: false }));
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      if (createDialogOpen) {
        setCreateDialogOpen(false);
      } else if (state.mobileMenuOpen) {
        closeMobileMenu();
      }
    },
    onNewConversation: () => {
      setCreateDialogOpen(true);
    },
    onToggleSidebar: toggleSidebar,
  });

  const handleConversationCreated = (conversation: { id: string }) => {
    router.push(`/chat/${conversation.id}`);
  };

  const contextValue: LayoutContextValue = {
    state,
    toggleMobileMenu,
    toggleSidebar,
    updateState,
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside aria-label="Main navigation">
            <Sidebar
              collapsed={state.sidebarCollapsed}
              mobileOpen={state.mobileMenuOpen}
              onMobileClose={closeMobileMenu}
              onToggleCollapse={toggleSidebar}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden" role="main">
          {/* Navbar */}
          {showNavbar && (
            <header
              aria-label="Page header"
              className="bg-[#111111] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center gap-2"
            >
              {/* Mobile menu button */}
              {showSidebar && <MobileMenuButton onClick={toggleMobileMenu} />}

              {/* Page title */}
              {state.pageTitle && (
                <h1 className="text-lg md:text-xl font-semibold">{state.pageTitle}</h1>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Custom actions */}
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </header>
          )}

          {/* Content Area */}
          <div className={cn('flex-1 overflow-y-auto', contentClassName)}>{children}</div>
        </main>

        {/* Create Conversation Dialog */}
        <CreateConversationDialog
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleConversationCreated}
          open={createDialogOpen}
        />
      </div>
    </LayoutContext.Provider>
  );
}

/**
 * Hook to access layout context
 * @throws {Error} If used outside LayoutProvider
 */
export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within DashboardLayout');
  }
  return context;
}
