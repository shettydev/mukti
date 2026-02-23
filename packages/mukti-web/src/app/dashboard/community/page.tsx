/**
 * Community page
 * Coming soon - will display community features
 */

import { Users } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ComingSoon } from '@/components/old-landing/coming-soon';

/**
 * Community page
 * Placeholder for community features
 */
export default function CommunityPage() {
  return (
    <DashboardLayout title="Community">
      <ComingSoon
        description="Connect with other users, share insights, and collaborate on inquiries. Join a community of critical thinkers exploring ideas through the Socratic method."
        feature="Community"
        icon={<Users className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q2 2026"
      />
    </DashboardLayout>
  );
}
