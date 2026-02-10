/**
 * Inquiry Sessions page
 * Coming soon - will display conversation session management
 */

import { MessageSquare } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ComingSoon } from '@/components/old-landing/coming-soon';

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
        timeline="Q2 2026"
      />
    </DashboardLayout>
  );
}
