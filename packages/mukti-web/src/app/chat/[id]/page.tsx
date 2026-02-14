'use client';

/**
 * Chat Detail Page - Active conversation view
 *
 * This page displays an existing conversation loaded by ID from the URL parameter.
 * Shows the active conversation state with message list and input bar.
 *
 * Features:
 * - Load conversation by ID from URL param
 * - Display active conversation state with message list
 * - Show input bar at bottom
 * - Integrate SSE streaming for real-time updates
 * - Protected route (requires authentication)
 *
 */

import { use } from 'react';
import { useCallback, useEffect, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChatInterface } from '@/components/chat';
import { DashboardLayout, useLayout } from '@/components/layouts/dashboard-layout';
import { useConversation } from '@/lib/hooks/use-conversations';

interface ChatDetailContentProps {
  conversationId: string;
}

interface ChatDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatDetailPage({ params }: ChatDetailPageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute redirectTo="/auth">
      <DashboardLayout
        contentClassName="flex min-h-0 flex-col overflow-hidden bg-japandi-cream/35 p-0"
        showNavbar={false}
      >
        <ChatDetailContent conversationId={id} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ChatDetailContent({ conversationId }: ChatDetailContentProps) {
  const { toggleMobileMenu } = useLayout();
  const [selectedTechnique, setSelectedTechnique] = useState<SocraticTechnique>('elenchus');

  // Fetch conversation to get the actual technique
  const { data: conversation } = useConversation(conversationId);

  // Initialize technique from conversation data
  useEffect(() => {
    if (conversation?.technique) {
      setSelectedTechnique(conversation.technique);
    }
  }, [conversation?.technique]);

  // This handler won't be called for existing conversations
  // but is required by ChatInterface
  const handleCreateConversation = useCallback(
    async (_content: string, _technique: SocraticTechnique): Promise<string> => {
      // This should never be called for an existing conversation
      return conversationId;
    },
    [conversationId]
  );

  const handleTechniqueChange = useCallback((technique: SocraticTechnique) => {
    setSelectedTechnique(technique);
    // TODO: Implement technique change for existing conversations
    // This would require an API endpoint to update conversation technique
  }, []);

  return (
    <ChatInterface
      conversationId={conversationId}
      isCreating={false}
      onCreateConversation={handleCreateConversation}
      onMobileMenuToggle={toggleMobileMenu}
      onTechniqueChange={handleTechniqueChange}
      selectedTechnique={selectedTechnique}
    />
  );
}
