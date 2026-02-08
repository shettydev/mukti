'use client';

/**
 * Quick Chat Interface - Main chat page
 *
 * This page displays a centered input layout when no conversation is active.
 * Users can start chatting immediately without extra navigation steps.
 *
 * Features:
 * - Centered input with quirky heading (empty state)
 * - Protected route (requires authentication)
 * - Clean, distraction-free interface
 * - First message creates conversation and navigates to detail
 * - Sidebar for navigation to existing conversations
 *
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChatInterface } from '@/components/chat';
import { DashboardLayout, useLayout } from '@/components/layouts/dashboard-layout';
import { useCreateConversation } from '@/lib/hooks/use-conversations';
import { conversationKeys } from '@/lib/query-keys';
import { generateTemporaryTitle } from '@/lib/utils/title-generation';

export default function ChatPage() {
  return (
    <ProtectedRoute redirectTo="/auth">
      <DashboardLayout contentClassName="flex flex-col overflow-hidden p-0" showNavbar={false}>
        <ChatContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ChatContent() {
  const { toggleMobileMenu } = useLayout();
  const [selectedTechnique, setSelectedTechnique] = useState<SocraticTechnique>('elenchus');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const queryClient = useQueryClient();
  const { isPending: isCreating, mutateAsync: createConversation } = useCreateConversation();

  /**
   * Handle creating conversation and sending first message
   *
   * Flow:
   * 1. Generate temporary title from message content
   * 2. Create conversation with title and technique
   * 3. Seed detail cache for immediate first render
   * 4. Start transition animation (navigation happens after optimistic append)
   * 5. Send message to new conversation (handled by ChatInterface)
   */
  const handleCreateConversation = useCallback(
    async (content: string, technique: SocraticTechnique): Promise<string> => {
      // Generate temporary title from message content
      const title = generateTemporaryTitle(content);

      // Create conversation
      const conversation = await createConversation({
        tags: [],
        technique,
        title,
      });

      // Ensure /chat/[id] can render immediately from cache before any network refetch.
      queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation);

      // Start transition animation
      setIsTransitioning(true);

      // Return conversation ID for message sending
      return conversation.id;
    },
    [createConversation, queryClient]
  );

  const handleTechniqueChange = useCallback((technique: SocraticTechnique) => {
    setSelectedTechnique(technique);
  }, []);

  return (
    <ChatInterface
      conversationId={null}
      isCreating={isCreating}
      isTransitioning={isTransitioning}
      onCreateConversation={handleCreateConversation}
      onMobileMenuToggle={toggleMobileMenu}
      onTechniqueChange={handleTechniqueChange}
      selectedTechnique={selectedTechnique}
    />
  );
}
