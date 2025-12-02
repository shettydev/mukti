/**
 * Messages page
 * Coming soon - will display messaging features
 */

import { Mail } from 'lucide-react';

import { ComingSoon } from '@/components/coming-soon';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

/**
 * Messages page
 * Placeholder for messaging and notifications
 */
export default function MessagesPage() {
  return (
    <DashboardLayout title="Messages">
      <ComingSoon
        description="Stay connected with direct messaging, notifications, and updates. Receive feedback on your inquiries and communicate with mentors and peers."
        feature="Messages"
        icon={<Mail className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q3 2024"
      />
    </DashboardLayout>
  );
}
