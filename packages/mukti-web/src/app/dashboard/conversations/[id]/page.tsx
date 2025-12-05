'use client';

import { use } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ConversationDetail } from '@/components/conversations';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

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
  return (
    <DashboardLayout contentClassName="flex flex-col overflow-hidden p-0" showNavbar={false}>
      <ConversationDetail conversationId={conversationId} />
    </DashboardLayout>
  );
}
