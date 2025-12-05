'use client';

/**
 * Thinking Canvas listing page
 * Displays user's canvas sessions and allows creating new ones
 */

import { Brain, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { CanvasSession } from '@/types/canvas.types';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { SessionCard, SetupWizardDialog } from '@/components/canvas';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCanvasSessions } from '@/lib/hooks/use-canvas';

/**
 * Thinking Canvas listing page component
 * Displays list of canvas sessions with ability to create new ones
 */
export default function CanvasListingPage() {
  return (
    <ProtectedRoute>
      <CanvasContent />
    </ProtectedRoute>
  );
}

function CanvasContent() {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: sessions, isLoading, refetch } = useCanvasSessions();

  const handleWizardSuccess = useCallback(
    (session: CanvasSession) => {
      // Refetch sessions list after successful creation
      refetch();
      // Navigate to the newly created canvas session
      router.push(`/dashboard/canvas/${session.id}`);
    },
    [refetch, router]
  );

  return (
    <DashboardLayout
      actions={
        <Button className="gap-2" onClick={() => setWizardOpen(true)}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Thinking Session</span>
          <span className="sm:hidden">New</span>
        </Button>
      }
      title="Thinking Canvas"
    >
      <div className="p-4 md:p-6">
        {isLoading ? (
          <CanvasLoadingSkeleton />
        ) : sessions && sessions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <EmptyState onCreateClick={() => setWizardOpen(true)} />
        )}
      </div>

      <SetupWizardDialog
        onOpenChange={setWizardOpen}
        onSuccess={handleWizardSuccess}
        open={wizardOpen}
      />
    </DashboardLayout>
  );
}

/**
 * Loading skeleton for canvas sessions list
 */
function CanvasLoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="rounded-lg border border-white/10 bg-[#111111] p-4" key={i}>
          <Skeleton className="h-5 w-3/4 mb-3" />
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no sessions exist
 */
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Brain className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No thinking sessions yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Start your first Socratic inquiry session by defining your problem structure. The AI will
        guide you through structured thinking.
      </p>
      <Button className="gap-2" onClick={onCreateClick}>
        <Plus className="w-4 h-4" />
        Create Your First Session
      </Button>
    </div>
  );
}
