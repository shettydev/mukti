'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForgotPassword } from '@/lib/hooks/use-auth';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { type ForgotPasswordFormData, forgotPasswordSchema } from '@/lib/validation';

interface ForgotPasswordFormProps {
  /**
   * Callback to go back to sign in
   */
  onBack?: () => void;
}

/**
 * Forgot password form component
 *
 * Features:
 * - Form validation with React Hook Form + Zod
 * - Email field with icon
 * - Success state with confirmation message
 * - Error handling with inline messages
 * - Loading state on submit button
 * - Back to sign in link
 *
 *
 * @example
 * ```tsx
 * <ForgotPasswordForm
 *   onBack={() => setShowForgotPassword(false)}
 * />
 * ```
 */
export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const forgotPasswordMutation = useForgotPassword();

  const form = useForm<ForgotPasswordFormData>({
    defaultValues: {
      email: '',
    },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation.mutateAsync(data);
      setIsSuccess(true);
      showSuccessToast('Password reset email sent! Check your inbox.');
    } catch (error) {
      // Show error toast with user-friendly message
      showErrorToast(error);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="space-y-4 sm:space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-500/20 p-2.5 sm:p-3">
            <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Check your email</h3>
          <p className="text-xs sm:text-sm text-white/70">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-white break-all">{form.getValues('email')}</span>
          </p>
          <p className="text-xs sm:text-sm text-white/60">
            The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
          </p>
        </div>

        <Button
          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 touch-manipulation h-11 sm:h-12 text-sm sm:text-base"
          onClick={onBack}
          type="button"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Button>
      </div>
    );
  }

  // Form state
  return (
    <Form {...form}>
      <form className="space-y-3 sm:space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-1.5 sm:space-y-2 text-center mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Forgot password?</h3>
          <p className="text-xs sm:text-sm text-white/70">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    {...field}
                    autoComplete="email"
                    autoFocus
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="john@example.com"
                    type="email"
                  />
                </div>
              </FormControl>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* API Error Message */}
        {forgotPasswordMutation.error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-red-300">
              {forgotPasswordMutation.error instanceof Error
                ? forgotPasswordMutation.error.message
                : 'Failed to send reset email. Please try again.'}
            </p>
          </div>
        )}

        {/* Submit Button - touch-friendly */}
        <Button
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium touch-manipulation h-11 sm:h-12 text-sm sm:text-base"
          disabled={forgotPasswordMutation.isPending}
          type="submit"
        >
          {forgotPasswordMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Reset Link
            </>
          )}
        </Button>

        {/* Back to Sign In */}
        <div className="text-center">
          <button
            className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors inline-flex items-center gap-1 touch-manipulation"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Sign In
          </button>
        </div>
      </form>
    </Form>
  );
}
