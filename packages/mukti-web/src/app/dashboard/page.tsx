'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/hooks/use-auth';

/**
 * Dashboard page (placeholder)
 *
 * This is a temporary placeholder for the dashboard.
 * Will be replaced with actual dashboard implementation.
 *
 */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

/**
 * Dashboard content component
 * Separated to allow ProtectedRoute to handle auth checks
 */
function DashboardContent() {
  const router = useRouter();
  const { isLoading, logout, user } = useAuth();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push('/');
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600 p-8">
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <UserProfileSkeleton />
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
            <h1 className="text-3xl font-bold text-white mb-4">Welcome to Mukti Dashboard</h1>
            <div className="text-white/90 space-y-2 mb-6">
              <p>
                <strong>Name:</strong> {user?.firstName} {user?.lastName}
              </p>
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Role:</strong> {user?.role}
              </p>
              <p>
                <strong>Email Verified:</strong> {user?.emailVerified ? 'Yes' : 'No'}
              </p>
            </div>
            <button
              className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-6 rounded-lg transition-colors border border-white/20"
              onClick={handleLogout}
              type="button"
            >
              <Loader2 className="inline-block mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for user profile
 */
function UserProfileSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
      <Skeleton className="h-9 w-64 mb-4 bg-white/20" />
      <div className="space-y-3 mb-6">
        <Skeleton className="h-5 w-48 bg-white/20" />
        <Skeleton className="h-5 w-56 bg-white/20" />
        <Skeleton className="h-5 w-32 bg-white/20" />
        <Skeleton className="h-5 w-40 bg-white/20" />
      </div>
      <Skeleton className="h-10 w-24 bg-white/20" />
    </div>
  );
}
