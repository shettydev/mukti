/**
 * Resources page
 * Coming soon - will display learning resources
 */

import { FileText } from 'lucide-react';

import { ComingSoon } from '@/components/coming-soon';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

/**
 * Resources page
 * Placeholder for learning resources and materials
 */
export default function ResourcesPage() {
  return (
    <DashboardLayout title="Resources">
      <ComingSoon
        description="Access curated learning materials, guides, and resources to enhance your critical thinking skills. Explore articles, videos, and exercises designed to deepen your understanding of the Socratic method."
        feature="Resources"
        icon={<FileText className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q3 2026"
      />
    </DashboardLayout>
  );
}
