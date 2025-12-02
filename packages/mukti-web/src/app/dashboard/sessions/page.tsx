/**
 * Inquiry Sessions page
 * Coming soon - will display conversation session management
 */

import { MessageSquare } from 'lucide-react';

import { ComingSoon } from '@/components/coming-soon';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

/**
 * Inquiry Sessions page
 * Placeholder for conversation session management feature
 */
export default function InquirySessionsPage() {
  return (
    <DashboardLayout title="Inquiry Sessions">
      <ComingSoon
        description="Manage your Socratic inquiry sessions, track conversation progress, and review past dialogues. This feature will help you organize and reflect on your cognitive journey."
        feature="Inquiry Sessions"
        icon={<MessageSquare className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q2 2024"
      />
    </DashboardLayout>
  );
}
