'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { ThoughtMapCanvas } from '@/components/thought-map/ThoughtMapCanvas';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useThoughtMap } from '@/lib/hooks/use-thought-map';
import { useThoughtMapActions } from '@/lib/stores/thought-map-store';

interface ThoughtMapDetailContentProps {
  mapId: string;
}

interface ThoughtMapDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ThoughtMapDetailPage({ params }: ThoughtMapDetailPageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute redirectTo="/auth">
      <ThoughtMapDetailContent mapId={id} />
    </ProtectedRoute>
  );
}

function ThoughtMapDetailContent({ mapId }: ThoughtMapDetailContentProps) {
  const { data, error, isLoading } = useThoughtMap(mapId);
  const { reset } = useThoughtMapActions();

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  if (isLoading) {
    return (
      <DashboardLayout showNavbar showSidebar>
        <ThoughtMapLoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout showNavbar showSidebar>
        <ThoughtMapErrorState error={error} />
      </DashboardLayout>
    );
  }

  if (data) {
    return (
      <DashboardLayout
        contentClassName="flex flex-col overflow-hidden p-0"
        showNavbar={false}
        showSidebar={false}
      >
        <ThoughtMapCanvas className="h-full w-full" mapId={mapId} />
      </DashboardLayout>
    );
  }

  return null;
}

function ThoughtMapErrorState({ error }: { error: Error }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="flex max-w-md flex-col items-center gap-4 px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load thought map</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button asChild variant="outline">
          <Link href="/maps">Back to Thought Maps</Link>
        </Button>
      </div>
    </div>
  );
}

function ThoughtMapLoadingSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <Skeleton className="h-20 w-48 rounded-xl" />
          <div className="absolute inset-0 animate-pulse rounded-xl bg-primary/5" />
        </div>

        <div className="flex items-center gap-16">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-32 rounded-lg" />
            <Skeleton className="h-14 w-32 rounded-lg" />
          </div>

          <div className="w-16" />

          <div className="flex flex-col gap-4">
            <Skeleton className="h-14 w-32 rounded-lg" />
            <Skeleton className="h-14 w-32 rounded-lg" />
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          <span className="ml-2 text-sm">Loading thought map…</span>
        </div>
      </div>
    </div>
  );
}
