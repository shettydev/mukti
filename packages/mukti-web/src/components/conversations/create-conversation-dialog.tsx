'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import type { Conversation } from '@/types/conversation.types';

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
import { useCreateConversation } from '@/lib/hooks/use-conversations';
import { generateTemporaryTitle } from '@/lib/utils/title-generation';
import {
  type CreateConversationFormData,
  createConversationSchema,
} from '@/lib/validation/conversation-schemas';

import { TagInput } from './tag-input';
import { TechniqueSelector } from './technique-selector';

interface CreateConversationDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess?: (conversation: Conversation) => void;
  open: boolean;
}

/**
 * Dialog for creating new conversations
 *
 * Features:
 * - Form validation with Zod
 * - Technique selector with descriptions
 * - Tag input for categorization
 * - Loading state during creation
 * - Error handling with toast notifications
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param onSuccess - Optional callback when conversation is created successfully
 */
export function CreateConversationDialog({
  onOpenChange,
  onSuccess,
  open,
}: CreateConversationDialogProps) {
  const createMutation = useCreateConversation();

  const form = useForm<CreateConversationFormData>({
    defaultValues: {
      tags: [],
      technique: undefined,
      title: '',
    },
    resolver: zodResolver(createConversationSchema),
  });

  const handleSubmit = async (data: CreateConversationFormData) => {
    try {
      const title =
        data.title.trim() ||
        generateTemporaryTitle(
          `New ${data.technique.charAt(0).toUpperCase()}${data.technique.slice(1)} conversation`
        );

      const conversation = await createMutation.mutateAsync({
        tags: data.tags,
        technique: data.technique,
        title,
      });

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);

      // Call success callback if provided
      onSuccess?.(conversation);
    } catch {
      // Error is handled by the mutation's error state
      // Toast notification could be added here
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Conversation</DialogTitle>
          <DialogDescription>
            Start a new Socratic dialogue. Choose a technique that best fits your inquiry.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="What would you like to explore?" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave blank to auto-generate a title while you start chatting.
                  </FormDescription>
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
                    <TechniqueSelector onChange={field.onChange} value={field.value} />
                  </FormControl>
                  <FormDescription>The Socratic method to guide your dialogue.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (optional)</FormLabel>
                  <FormControl>
                    <TagInput
                      onChange={field.onChange}
                      placeholder="Add tags to categorize..."
                      value={field.value || []}
                    />
                  </FormControl>
                  <FormDescription>Press Enter or comma to add tags. Max 10 tags.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                disabled={createMutation.isPending}
                onClick={() => handleOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={createMutation.isPending} type="submit">
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Conversation'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
