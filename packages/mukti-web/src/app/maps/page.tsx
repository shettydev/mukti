'use client';

import { Loader2, MoreHorizontal, Network, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ThoughtMap } from '@/types/thought-map';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { CreateThoughtMapDialog } from '@/components/thought-map/CreateThoughtMapDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteThoughtMap, useThoughtMaps } from '@/lib/hooks/use-thought-map';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/time-formatting';

interface ThoughtMapCardProps {
  map: ThoughtMap;
  onClick: () => void;
  onDelete: (id: string, title: string) => void;
}

export default function ThoughtMapsPage() {
  return (
    <ProtectedRoute redirectTo="/auth">
      <ThoughtMapsContent />
    </ProtectedRoute>
  );
}

function ThoughtMapCard({ map, onClick, onDelete }: ThoughtMapCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="group relative flex min-h-44 cursor-pointer flex-col rounded-2xl border border-japandi-sand/70 bg-japandi-cream/60 p-5 text-left transition-all hover:border-japandi-sage/60 hover:bg-japandi-cream/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="rounded-xl bg-primary/10 p-3">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-japandi-sage/15 px-2.5 py-1 text-xs font-medium capitalize text-japandi-stone/75">
            {map.status}
          </span>
          <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  'h-7 w-7 p-0 transition-opacity hover:bg-primary/10',
                  menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
                onClick={(e) => e.stopPropagation()}
                size="icon"
                variant="ghost"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:bg-red-500/10 focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(map.id, map.title);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
    </div>
  );
}

function ThoughtMapsContent() {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    id: string;
    open: boolean;
    title: string;
  }>({ id: '', open: false, title: '' });

  const { data: maps, error, isLoading } = useThoughtMaps();
  const { isPending: isDeleting, mutate: deleteMap } = useDeleteThoughtMap();

  const handleDeleteRequest = (id: string, title: string) => {
    setDeleteDialog({ id, open: true, title });
  };

  const handleDeleteConfirm = () => {
    deleteMap(deleteDialog.id, {
      onError: () => {
        toast.error('Failed to delete thought map');
      },
      onSuccess: () => {
        toast.success('Thought map deleted successfully');
        setDeleteDialog({ id: '', open: false, title: '' });
      },
    });
  };

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
                onDelete={handleDeleteRequest}
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

      <Dialog
        onOpenChange={(open) => !isDeleting && setDeleteDialog((prev) => ({ ...prev, open }))}
        open={deleteDialog.open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete thought map</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.title}&quot;? All nodes and share
              links will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={isDeleting}
              onClick={() => setDeleteDialog({ id: '', open: false, title: '' })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isDeleting} onClick={handleDeleteConfirm} variant="destructive">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
