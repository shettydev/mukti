'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { use, useState } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ConversationDetail } from '@/components/conversations';
import { MobileMenuButton, Sidebar } from '@/components/dashboard/sidebar';
import { Button } from '@/components/ui/button';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';

interface ConversationDetailContentProps {
  conversationId: string;
}

interface ConversationDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Conversation detail page
 * Displays a specific conversation with messages and input
 *
 * Features:
 * - Responsive layout (single column mobile, sidebar desktop)
 * - Keyboard shortcuts
 * - Accessible navigation
 *
 */
export default function ConversationDetailPage({ params }: ConversationDetailPageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute>
      <ConversationDetailContent conversationId={id} />
    </ProtectedRoute>
  );
}

function ConversationDetailContent({ conversationId }: ConversationDetailContentProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      setMobileMenuOpen(false);
    },
  });

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
        {/* Header with collapse toggle - only visible on mobile or when needed */}
        <header className="bg-[#111111] border-b border-white/10 px-2 py-2 flex items-center md:hidden">
          {/* Mobile menu button */}
          <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
        </header>

        {/* Desktop header with collapse toggle */}
        <header className="hidden md:flex bg-[#111111] border-b border-white/10 px-2 py-2 items-center">
          <Button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="min-h-[44px] min-w-[44px]"
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
        </header>

        {/* Conversation Detail */}
        <div className="flex-1 overflow-hidden">
          <ConversationDetail conversationId={conversationId} />
        </div>
      </main>
    </div>
  );
}
