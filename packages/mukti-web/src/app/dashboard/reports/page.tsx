/**
 * Reports & Analytics page
 * Coming soon - will display analytics and insights
 */

import { BarChart } from 'lucide-react';

import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ComingSoon } from '@/components/old-landing/coming-soon';

/**
 * Reports & Analytics page
 * Placeholder for analytics and reporting features
 */
export default function ReportsPage() {
  return (
    <DashboardLayout title="Reports & Analytics">
      <ComingSoon
        description="Track your progress, analyze conversation patterns, and gain insights into your cognitive development. Visualize your learning journey with detailed analytics and reports."
        feature="Reports & Analytics"
        icon={<BarChart className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q4 2026"
      />
    </DashboardLayout>
  );
}
