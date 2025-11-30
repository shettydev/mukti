'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import type { Conversation, SocraticTechnique } from '@/types/conversation.types';

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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUpdateConversation } from '@/lib/hooks/use-conversations';
import {
  TECHNIQUE_DESCRIPTIONS,
  type UpdateConversationFormData,
  updateConversationSchema,
} from '@/lib/validation/conversation-schemas';

import { TagInput } from './tag-input';
import { TechniqueSelector } from './technique-selector';

interface UpdateConversationDialogProps {
  conversation: Conversation;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (conversation: Conversation) => void;
  open: boolean;
}

/**
 * Dialog for updating conversation properties
 *
 * Features:
 * - Edit title, technique, and tags
 * - Technique change confirmation
 * - Form validation with Zod
 * - Loading state during update
 * - Preserves unchanged fields
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param conversation - The conversation to update
 * @param onSuccess - Optional callback when update is successful
 */
export function UpdateConversationDialog({
  conversation,
  onOpenChange,
  onSuccess,
  open,
}: UpdateConversationDialogProps) {
  const updateMutation = useUpdateConversation(conversation.id);
  const [showTechniqueWarning, setShowTechniqueWarning] = React.useState(false);
  const [pendingTechnique, setPendingTechnique] = React.useState<null | SocraticTechnique>(null);

  const form = useForm<UpdateConversationFormData>({
    defaultValues: {
      tags: conversation.tags,
      technique: conversation.technique,
      title: conversation.title,
    },
    resolver: zodResolver(updateConversationSchema),
  });

  // Reset form when conversation changes
  React.useEffect(() => {
    form.reset({
      tags: conversation.tags,
      technique: conversation.technique,
      title: conversation.title,
    });
  }, [conversation, form]);

  const handleTechniqueChange = (newTechnique: SocraticTechnique) => {
    // If technique is changing and conversation has messages, show warning
    if (newTechnique !== conversation.technique && conversation.metadata.messageCount > 0) {
      setPendingTechnique(newTechnique);
      setShowTechniqueWarning(true);
    } else {
      form.setValue('technique', newTechnique);
    }
  };

  const confirmTechniqueChange = () => {
    if (pendingTechnique) {
      form.setValue('technique', pendingTechnique);
    }
    setShowTechniqueWarning(false);
    setPendingTechnique(null);
  };

  const cancelTechniqueChange = () => {
    setShowTechniqueWarning(false);
    setPendingTechnique(null);
  };

  const handleSubmit = async (data: UpdateConversationFormData) => {
    try {
      // Only include changed fields
      const updates: UpdateConversationFormData = {};

      if (data.title !== conversation.title) {
        updates.title = data.title;
      }
      if (data.technique !== conversation.technique) {
        updates.technique = data.technique;
      }
      if (JSON.stringify(data.tags) !== JSON.stringify(conversation.tags)) {
        updates.tags = data.tags;
      }

      // Only update if there are changes
      if (Object.keys(updates).length === 0) {
        onOpenChange(false);
        return;
      }

      const updatedConversation = await updateMutation.mutateAsync(updates);
      onOpenChange(false);
      onSuccess?.(updatedConversation);
    } catch {
      // Error is handled by the mutation's error state
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      form.reset({
        tags: conversation.tags,
        technique: conversation.technique,
        title: conversation.title,
      });
      setShowTechniqueWarning(false);
      setPendingTechnique(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Conversation</DialogTitle>
            <DialogDescription>
              Update the conversation title, technique, or tags.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="technique"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technique</FormLabel>
                    <FormControl>
                      <TechniqueSelector
                        onChange={handleTechniqueChange}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Changing the technique may affect how future responses are generated.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        onChange={field.onChange}
                        value={field.value || []}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  disabled={updateMutation.isPending}
                  onClick={() => handleOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={updateMutation.isPending} type="submit">
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Technique Change Confirmation Dialog */}
      <Dialog onOpenChange={cancelTechniqueChange} open={showTechniqueWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <DialogTitle>Change Technique?</DialogTitle>
                <DialogDescription>
                  This conversation has existing messages.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Changing the technique from{' '}
              <span className="font-medium text-foreground">
                {TECHNIQUE_DESCRIPTIONS[conversation.technique].name}
              </span>{' '}
              to{' '}
              <span className="font-medium text-foreground">
                {pendingTechnique && TECHNIQUE_DESCRIPTIONS[pendingTechnique].name}
              </span>{' '}
              will affect how future AI responses are generated. Existing messages will remain unchanged.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={cancelTechniqueChange} type="button" variant="outline">
              Keep Current
            </Button>
            <Button onClick={confirmTechniqueChange} type="button">
              Change Technique
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
