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
 *
 */

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { SocraticTechnique } from '@/types/conversation.types';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChatInterface } from '@/components/chat';
import { useCreateConversation } from '@/lib/hooks/use-conversations';
import { generateTemporaryTitle } from '@/lib/utils/title-generation';

export default function ChatPage() {
  return (
    <ProtectedRoute redirectTo="/auth">
      <ChatContent />
    </ProtectedRoute>
  );
}

function ChatContent() {
  const router = useRouter();
  const [selectedTechnique, setSelectedTechnique] = useState<SocraticTechnique>('elenchus');
  const { isPending: isCreating, mutateAsync: createConversation } = useCreateConversation();

  /**
   * Handle creating conversation and sending first message
   *
   * Flow:
   * 1. Generate temporary title from message content
   * 2. Create conversation with title and technique
   * 3. Navigate to /chat/:id
   * 4. Send message to new conversation (handled by ChatInterface)
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

      // Navigate to conversation detail
      router.push(`/chat/${conversation.id}`);

      // Return conversation ID for message sending
      return conversation.id;
    },
    [createConversation, router]
  );

  const handleTechniqueChange = useCallback((technique: SocraticTechnique) => {
    setSelectedTechnique(technique);
  }, []);

  return (
    <ChatInterface
      conversationId={null}
      isCreating={isCreating}
      onCreateConversation={handleCreateConversation}
      onTechniqueChange={handleTechniqueChange}
      selectedTechnique={selectedTechnique}
    />
  );
}
