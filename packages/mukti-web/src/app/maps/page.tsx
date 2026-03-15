'use client';

import { Loader2, Network, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ThoughtMap } from '@/types/thought-map';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { CreateThoughtMapDialog } from '@/components/thought-map/CreateThoughtMapDialog';
import { Button } from '@/components/ui/button';
import { useThoughtMaps } from '@/lib/hooks/use-thought-map';
import { formatRelativeTime } from '@/lib/utils/time-formatting';

export default function ThoughtMapsPage() {
  return (
    <ProtectedRoute redirectTo="/auth">
      <ThoughtMapsContent />
    </ProtectedRoute>
  );
}

function ThoughtMapCard({ map, onClick }: { map: ThoughtMap; onClick: () => void }) {
  return (
    <button
      className="flex min-h-44 flex-col rounded-2xl border border-japandi-sand/70 bg-japandi-cream/60 p-5 text-left transition-all hover:border-japandi-sage/60 hover:bg-japandi-cream/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={onClick}
      type="button"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <span className="rounded-full bg-japandi-sage/15 px-2.5 py-1 text-xs font-medium capitalize text-japandi-stone/75">
          {map.status}
        </span>
      </div>

      <div className="min-w-0">
        <h2 className="line-clamp-2 text-base font-semibold text-japandi-stone">{map.title}</h2>
        <p className="mt-2 text-sm text-japandi-stone/65">
          {map.nodeCount} node{map.nodeCount === 1 ? '' : 's'}
        </p>
      </div>

      <p className="mt-auto pt-6 text-xs text-japandi-stone/55">
        Updated {formatRelativeTime(map.updatedAt)}
      </p>
    </button>
  );
}

function ThoughtMapsContent() {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: maps, error, isLoading } = useThoughtMaps();

  return (
    <DashboardLayout
      actions={
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Thought Map</span>
          <span className="sm:hidden">New</span>
        </Button>
      }
      title="Thought Maps"
    >
      <div className="p-4 md:p-6">
        {isLoading ? (
          <ThoughtMapsLoadingState />
        ) : error ? (
          <ThoughtMapsErrorState message={error.message} />
        ) : maps && maps.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {maps.map((map) => (
              <ThoughtMapCard
                key={map.id}
                map={map}
                onClick={() => {
                  router.push(`/maps/${map.id}`);
                }}
              />
            ))}
          </div>
        ) : (
          <ThoughtMapsEmptyState onCreate={() => setCreateDialogOpen(true)} />
        )}
      </div>

      <CreateThoughtMapDialog
        onOpenChange={setCreateDialogOpen}
        onSuccess={(map) => {
          router.push(`/maps/${map.id}`);
        }}
        open={createDialogOpen}
      />
    </DashboardLayout>
  );
}

function ThoughtMapsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4">
        <Network className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-japandi-stone">No thought maps yet</h2>
      <p className="mt-2 max-w-md text-sm text-japandi-stone/65">
        Start a new thought map to explore an idea, branch your reasoning, and revisit it from the
        sidebar later.
      </p>
      <Button className="mt-6 gap-2" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        Create Your First Thought Map
      </Button>
    </div>
  );
}

function ThoughtMapsErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="rounded-2xl border border-red-300/40 bg-red-500/5 p-6 text-center">
        <p className="text-sm font-medium text-japandi-stone">Failed to load thought maps</p>
        <p className="mt-2 text-sm text-japandi-stone/65">{message}</p>
      </div>
    </div>
  );
}

function ThoughtMapsLoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-japandi-stone/55" />
    </div>
  );
}
