'use client';

import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ConversationList, CreateConversationDialog } from '@/components/conversations';
import { MobileMenuButton, Sidebar } from '@/components/dashboard/sidebar';
import { Button } from '@/components/ui/button';
import { formatShortcut, useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

/**
 * Conversations list page
 * Displays all user conversations with filtering and infinite scroll
 *
 * Features:
 * - Responsive layout (single column mobile, sidebar desktop)
 * - Keyboard shortcuts (Cmd/Ctrl+K search, Cmd/Ctrl+N new)
 * - Accessible navigation
 *
 * Requirements: 4.6, 5.1-5.9, 14.1, 14.2, 15.1, 15.2
 */
export default function ConversationsPage() {
  return (
    <ProtectedRoute>
      <ConversationsContent />
    </ProtectedRoute>
  );
}

function ConversationsContent() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      setCreateDialogOpen(false);
      setMobileMenuOpen(false);
    },
    onNewConversation: () => {
      setCreateDialogOpen(true);
    },
    onSearch: () => {
      // TODO: Implement search dialog
    },
  });

  const handleConversationCreated = (conversation: { id: string }) => {
    router.push(`/dashboard/conversations/${conversation.id}`);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden" role="main">
        {/* Header */}
        <header className="bg-[#111111] border-b border-white/10 px-4 md:px-6 py-3 md:py-4 flex items-center gap-2">
          {/* Mobile menu button */}
          <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />

          {/* Desktop collapse button */}
          <Button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex min-h-[44px] min-w-[44px]"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            size="icon"
            variant="ghost"
          >
            {sidebarCollapsed ? (
              <ChevronRight aria-hidden="true" className="w-5 h-5" />
            ) : (
              <ChevronLeft aria-hidden="true" className="w-5 h-5" />
            )}
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Search button with shortcut hint */}
            <Button
              aria-label={`Search conversations (${formatShortcut('K')})`}
              className="hidden sm:flex items-center gap-2 min-h-[44px]"
              size="sm"
              variant="outline"
            >
              <Search aria-hidden="true" className="w-4 h-4" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                {formatShortcut('K')}
              </kbd>
            </Button>

            {/* New conversation button */}
            <Button
              aria-label={`Create new conversation (${formatShortcut('N')})`}
              className="min-h-[44px] gap-2"
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
            >
              <Plus aria-hidden="true" className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <ConversationList />
          </div>
        </div>
      </main>

      {/* Create Conversation Dialog */}
      <CreateConversationDialog
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleConversationCreated}
        open={createDialogOpen}
      />
    </div>
  );
}
