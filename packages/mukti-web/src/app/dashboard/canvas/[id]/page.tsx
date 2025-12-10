'use client';

/**
 * Canvas detail page
 *
 * Displays a specific canvas session with the ThinkingCanvas visualization.
 * Handles loading, error, and not-found states.
 *
 * @requirements 10.1, 10.2, 10.3
 */

import { AlertCircle } from 'lucide-react';
import { notFound } from 'next/navigation';
import { use, useCallback, useEffect } from 'react';

import type { Position } from '@/types/canvas-visualization.types';
import type { NodePosition } from '@/types/canvas.types';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { ThinkingCanvas } from '@/components/canvas';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCanvasInsights,
  useCanvasSession,
  useUpdateCanvasSession,
  useUpdateInsight,
} from '@/lib/hooks/use-canvas';

// ============================================================================
// Types
// ============================================================================

interface CanvasDetailContentProps {
  canvasId: string;
}

interface CanvasDetailPageProps {
  params: Promise<{ id: string }>;
}

// ============================================================================
// Page Component (Export)
// ============================================================================

/**
 * Canvas detail page component
 * Displays the ThinkingCanvas visualization for a specific session
 */
export default function CanvasDetailPage({ params }: CanvasDetailPageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute>
      <CanvasDetailContent canvasId={id} />
    </ProtectedRoute>
  );
}

// ============================================================================
// Internal Components (Alphabetical)
// ============================================================================

function CanvasDetailContent({ canvasId }: CanvasDetailContentProps) {
  const { data: session, error, isLoading, refetch } = useCanvasSession(canvasId);
  const { data: insights, isLoading: isLoadingInsights } = useCanvasInsights(canvasId);
  const { mutate: updateSession } = useUpdateCanvasSession();
  const { mutate: updateInsight } = useUpdateInsight();

  // Handle not found - redirect to not-found page
  useEffect(() => {
    if (error && (error.message.includes('not found') || error.message.includes('404'))) {
      notFound();
    }
  }, [error]);

  /**
   * Handle node position changes for persistence
   */
  const handlePositionChange = useCallback(
    (nodeId: string, position: Position) => {
      if (!session) {
        return;
      }

      // Check if it's an insight node
      if (nodeId.startsWith('insight-')) {
        updateInsight({
          dto: { x: position.x, y: position.y },
          nodeId,
          sessionId: canvasId,
        });
        return;
      }

      // Build updated positions array
      const existingPositions = session.nodePositions || [];
      const updatedPositions: NodePosition[] = existingPositions.filter((p) => p.nodeId !== nodeId);
      updatedPositions.push({ nodeId, x: position.x, y: position.y });

      // Persist to backend
      updateSession({
        dto: { nodePositions: updatedPositions },
        id: canvasId,
      });
    },
    [session, canvasId, updateSession, updateInsight]
  );

  // Loading state (Requirement 1.3 - load insights alongside session)
  if (isLoading || isLoadingInsights) {
    return (
      <DashboardLayout showNavbar showSidebar>
        <CanvasLoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Error state (non-404 errors)
  if (error && !error.message.includes('not found') && !error.message.includes('404')) {
    return (
      <DashboardLayout showNavbar showSidebar>
        <CanvasErrorState error={error} onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  // Session loaded successfully (Requirement 1.3 - initialize store with insights)
  if (session) {
    return (
      <DashboardLayout contentClassName="flex flex-col overflow-hidden p-0" showNavbar showSidebar>
        <ThinkingCanvas
          className="h-full w-full"
          insights={insights}
          onPositionChange={handlePositionChange}
          session={session}
        />
      </DashboardLayout>
    );
  }

  // Fallback - should not reach here normally
  return null;
}

/**
 * Error state component
 */
function CanvasErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load canvas</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for canvas page
 */
function CanvasLoadingSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        {/* Central node skeleton */}
        <Skeleton className="h-24 w-48 rounded-lg" />

        {/* Satellite nodes skeleton */}
        <div className="flex gap-8">
          <Skeleton className="h-16 w-32 rounded-lg" />
          <Skeleton className="h-16 w-32 rounded-lg" />
        </div>

        {/* Loading text */}
        <p className="text-sm text-muted-foreground">Loading canvas...</p>
      </div>
    </div>
  );
}
