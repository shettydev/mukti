/**
 * Settings page
 * Coming soon - will display user settings and preferences
 */

import { Settings } from 'lucide-react';

import { ComingSoon } from '@/components/coming-soon';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

/**
 * Settings page
 * Placeholder for user settings and preferences
 */
export default function SettingsPage() {
  return (
    <DashboardLayout title="Settings">
      <ComingSoon
        description="Customize your experience with personalized settings. Manage your profile, preferences, notifications, and privacy settings all in one place."
        feature="Settings"
        icon={<Settings className="w-16 h-16 md:w-20 md:h-20" />}
        timeline="Q2 2024"
      />
    </DashboardLayout>
  );
}
