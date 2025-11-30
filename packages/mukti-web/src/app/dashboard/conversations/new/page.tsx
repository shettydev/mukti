'use client';

import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { Conversation } from '@/types/conversation.types';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { CreateConversationDialog } from '@/components/conversations';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Button } from '@/components/ui/button';

/**
 * New conversation page
 * Displays the create conversation dialog in a full page context
 *
 * Requirements: 4.1-4.7, 9.6
 */
export default function NewConversationPage() {
  return (
    <ProtectedRoute>
      <NewConversationContent />
    </ProtectedRoute>
  );
}

function NewConversationContent() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(true);

  const handleSuccess = (conversation: Conversation) => {
    // Navigate to the newly created conversation
    router.push(`/dashboard/conversations/${conversation.id}`);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Navigate back to conversations list when dialog is closed
      router.push('/dashboard/conversations');
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#111111] border-b border-white/10 px-6 py-4 flex items-center gap-4">
          <Button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            size="icon"
            variant="ghost"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard/conversations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Conversations
            </Link>
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Create New Conversation</h1>
              <p className="text-white/60">
                Start a new Socratic dialogue to explore ideas through structured inquiry.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Create Conversation Dialog */}
      <CreateConversationDialog
        onOpenChange={handleOpenChange}
        onSuccess={handleSuccess}
        open={dialogOpen}
      />
    </div>
  );
}
