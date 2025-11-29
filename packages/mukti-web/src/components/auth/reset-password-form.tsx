'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
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
import { useResetPassword } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import {
  checkPasswordRequirements,
  type ResetPasswordFormData,
  resetPasswordSchema,
} from '@/lib/validation';

interface ResetPasswordFormProps {
  /**
   * Callback when password reset is successful
   */
  onSuccess?: () => void;
  /**
   * Reset token from email link
   */
  token: string;
}

/**
 * Reset password form component
 *
 * Features:
 * - Form validation with React Hook Form + Zod
 * - Password strength indicator
 * - Password confirmation
 * - Show/hide password toggle
 * - Inline error messages
 * - Loading state on submit button
 * - Success state with confirmation
 *
 * @example
 * ```tsx
 * <ResetPasswordForm
 *   token={token}
 *   onSuccess={() => router.push('/auth/signin')}
 * />
 * ```
 */
export function ResetPasswordForm({ onSuccess, token }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resetPasswordMutation = useResetPassword();

  const form = useForm<ResetPasswordFormData>({
    defaultValues: {
      confirmPassword: '',
      newPassword: '',
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = form.watch('newPassword');

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPasswordMutation.mutateAsync({
        newPassword: data.newPassword,
        token,
      });
      showSuccessToast('Password reset successfully! You can now sign in with your new password.');
      onSuccess?.();
    } catch (error) {
      // Show error toast with user-friendly message
      showErrorToast(error);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-3 sm:space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-1.5 sm:space-y-2 text-center mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white">Reset your password</h3>
          <p className="text-xs sm:text-sm text-white/70">
            Enter your new password below. Make sure it&apos;s strong and secure.
          </p>
        </div>

        {/* New Password */}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    {...field}
                    autoComplete="new-password"
                    autoFocus
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors touch-manipulation"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* Password Strength Indicator */}
        {password && <PasswordStrength password={password} />}

        {/* Confirm Password */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    {...field}
                    autoComplete="new-password"
                    className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base"
                    placeholder="••••••••"
                    type={showConfirmPassword ? 'text' : 'password'}
                  />
                  <button
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors touch-manipulation"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    type="button"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* API Error Message */}
        {resetPasswordMutation.error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-red-300">
              {resetPasswordMutation.error instanceof Error
                ? resetPasswordMutation.error.message
                : 'Failed to reset password. The link may have expired.'}
            </p>
          </div>
        )}

        {/* Submit Button - touch-friendly */}
        <Button
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium touch-manipulation h-11 sm:h-12 text-sm sm:text-base"
          disabled={resetPasswordMutation.isPending}
          type="submit"
        >
          {resetPasswordMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden xs:inline">Resetting password...</span>
              <span className="xs:hidden">Resetting...</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Reset Password
            </>
          )}
        </Button>

        <FormDescription className="text-center text-white/60 text-[10px] sm:text-xs">
          After resetting your password, you&apos;ll need to sign in again on all devices.
        </FormDescription>
      </form>
    </Form>
  );
}

/**
 * Password strength indicator component
 * Uses centralized validation helpers
 */
function PasswordStrength({ password }: { password: string }) {
  const requirements = checkPasswordRequirements(password);

  const checks = [
    { label: 'At least 8 characters', passed: requirements.minLength },
    { label: 'One lowercase letter', passed: requirements.hasLowercase },
    { label: 'One uppercase letter', passed: requirements.hasUppercase },
    { label: 'One number', passed: requirements.hasNumber },
    { label: 'One special character', passed: requirements.hasSpecialChar },
  ];

  const passedChecks = checks.filter((check) => check.passed).length;
  const strength = passedChecks === 0 ? 0 : (passedChecks / checks.length) * 100;

  const getStrengthColor = () => {
    if (strength === 0) {
      return 'bg-white/20';
    }
    if (strength < 40) {
      return 'bg-red-500';
    }
    if (strength < 80) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength === 0) {
      return '';
    }
    if (strength < 40) {
      return 'Weak';
    }
    if (strength < 80) {
      return 'Medium';
    }
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/60">Password strength</span>
        {strength > 0 && (
          <span
            className={cn(
              'text-xs font-medium',
              strength < 40 && 'text-red-400',
              strength >= 40 && strength < 80 && 'text-yellow-400',
              strength >= 80 && 'text-green-400'
            )}
          >
            {getStrengthLabel()}
          </span>
        )}
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300', getStrengthColor())}
          style={{ width: `${strength}%` }}
        />
      </div>
      <ul className="space-y-1">
        {checks.map((check, index) => (
          <li
            className={cn(
              'text-xs flex items-center gap-1.5',
              check.passed ? 'text-green-400' : 'text-white/40'
            )}
            key={index}
          >
            <CheckCircle2 className={cn('h-3 w-3', check.passed ? 'opacity-100' : 'opacity-30')} />
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
