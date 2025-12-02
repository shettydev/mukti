'use client';

import { Plus, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ConversationList, CreateConversationDialog } from '@/components/conversations';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
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
  const searchParams = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Auto-open dialog if redirected from /new route
  useEffect(() => {
    if (searchParams.get('openDialog') === 'true') {
      setCreateDialogOpen(true);
      // Clean up the URL by removing the query parameter
      const url = new URL(window.location.href);
      url.searchParams.delete('openDialog');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      setCreateDialogOpen(false);
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
    <DashboardLayout
      actions={
        <>
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
        </>
      }
      contentClassName="p-4 md:p-6"
      title="Conversations"
    >
      <div className="max-w-6xl mx-auto">
        <ConversationList onCreateClick={() => setCreateDialogOpen(true)} />
      </div>

      {/* Create Conversation Dialog */}
      <CreateConversationDialog
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleConversationCreated}
        open={createDialogOpen}
      />
    </DashboardLayout>
  );
}
