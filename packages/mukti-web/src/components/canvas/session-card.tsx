'use client';

/**
 * Session Card component for Thinking Canvas
 * Displays individual canvas session information
 */

import { formatDistanceToNow } from 'date-fns';
import { Brain, GitBranch, Layers, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import type { CanvasSession } from '@/types/canvas.types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useDeleteCanvasSession } from '@/lib/hooks/use-canvas';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: CanvasSession;
}

/**
 * SessionCard component
 *
 * Displays:
 * - Session seed (problem statement) as title
 * - Creation date
 * - Soil/roots count summary
 * - Click handler to navigate to canvas detail
 *
 * @param session - The canvas session to display
 */
export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    id: string;
    open: boolean;
    title: string;
  }>({ id: '', open: false, title: '' });
  const [menuOpen, setMenuOpen] = useState(false);

  const { isPending: isDeleting, mutate: deleteSession } = useDeleteCanvasSession();

  const handleClick = () => {
    // Navigate to canvas detail page
    router.push(`/canvas/${session.id}`);
  };

  const handleDeleteConfirm = () => {
    deleteSession(deleteDialog.id, {
      onError: () => {
        toast.error('Failed to delete canvas session');
      },
      onSuccess: () => {
        toast.success('Canvas session deleted successfully');
        setDeleteDialog({ id: '', open: false, title: '' });
      },
    });
  };

  const createdAt = formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });
  const soilCount = session.problemStructure.soil.length;
  const rootsCount = session.problemStructure.roots.length;

  // Truncate seed if too long
  const truncatedSeed =
    session.problemStructure.seed.length > 100
      ? `${session.problemStructure.seed.slice(0, 100)}...`
      : session.problemStructure.seed;

  return (
    <>
      <Card
        className="group relative cursor-pointer transition-all hover:border-primary/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-medium line-clamp-2 flex-1">
                  {truncatedSeed}
                </CardTitle>
                <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className={cn(
                        'h-6 w-6 p-0 transition-opacity hover:bg-primary/10',
                        menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      onClick={(e) => e.stopPropagation()}
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:bg-red-500/10 focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialog({
                          id: session.id,
                          open: true,
                          title: session.problemStructure.seed,
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription className="mt-1 text-xs">{createdAt}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5" title="Context items">
              <Layers className="w-3.5 h-3.5" />
              <span>
                {soilCount} {soilCount === 1 ? 'context' : 'contexts'}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title="Assumptions">
              <GitBranch className="w-3.5 h-3.5" />
              <span>
                {rootsCount} {rootsCount === 1 ? 'assumption' : 'assumptions'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(open) => !isDeleting && setDeleteDialog((prev) => ({ ...prev, open }))}
        open={deleteDialog.open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete thinking canvas session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteDialog.title}&quot;? This action cannot
              be undone.
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
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
