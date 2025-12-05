/**
 * Help & Support page
 * Coming soon - will display help resources and support options
 */

import { HelpCircle } from 'lucide-react';

import { ComingSoon } from '@/components/coming-soon';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

/**
 * Help & Support page
 * Placeholder for help documentation and support
 */
export default function HelpPage() {
  return (
    <DashboardLayout title="Help & Support">
      <ComingSoon
        description="Get help when you need it. Access comprehensive documentation, FAQs, tutorials, and contact our support team for assistance with any questions or issues."
        feature="Help & Support"
        icon={<HelpCircle className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q2 2026"
      />
    </DashboardLayout>
  );
}
