'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { NewThoughtMapCanvas } from '@/components/thought-map/NewThoughtMapCanvas';

export default function NewThoughtMapPage() {
  return (
    <ProtectedRoute redirectTo="/auth">
      <DashboardLayout contentClassName="flex flex-col overflow-hidden p-0" title="New Thought Map">
        <NewThoughtMapCanvas />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
