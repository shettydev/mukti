'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, LogIn, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/lib/hooks/use-auth';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';
import { type LoginFormData, loginSchema } from '@/lib/validation';

interface SignInFormProps {
  /**
   * Callback to open forgot password flow
   */
  onForgotPassword?: () => void;
  /**
   * Callback when sign in is successful
   */
  onSuccess?: () => void;
  /**
   * Callback to switch to sign up form
   */
  onSwitchToSignUp?: () => void;
}

/**
 * Sign in form component with validation and automatic dashboard redirect
 *
 * Features:
 * - Form validation with React Hook Form + Zod
 * - Email and password fields with dark backgrounds
 * - Remember me checkbox
 * - Forgot password link
 * - Show/hide password toggle
 * - Inline error messages
 * - Blue gradient submit button
 * - Loading state on submit button
 * - Automatic redirect to dashboard on success
 *
 * @example
 * ```tsx
 * <SignInForm
 *   onSuccess={() => console.log('Sign in successful')}
 *   onSwitchToSignUp={() => setTab('signup')}
 *   onForgotPassword={() => setShowForgotPassword(true)}
 * />
 * ```
 */
export function SignInForm({ onForgotPassword, onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const loginMutation = useLogin();

  const form = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Pass rememberMe to the backend to handle cookie expiration
      await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      showSuccessToast('Welcome back!');

      setIsRedirecting(true);
      router.push('/chat');

      // Call onSuccess callback if provided
      onSuccess?.();
    } catch (error) {
      // Show error toast with user-friendly message
      showErrorToast(error);
    }
  };

  const isLoading = loginMutation.isPending || isRedirecting;

  return (
    <Form {...form}>
      <form className="space-y-4 sm:space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-japandi-label text-japandi-stone/85">Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-japandi-timber/60" />
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="email"
                    className="h-11 border-japandi-sand/80 bg-japandi-cream/65 pl-10 text-japandi-stone placeholder:text-japandi-stone/45 focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30 sm:h-12 sm:text-base disabled:opacity-50"
                    disabled={isLoading}
                    placeholder="john@example.com"
                    type="email"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-xs text-red-600 dark:text-red-300" />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-japandi-label text-japandi-stone/85">Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="current-password"
                    className="h-11 border-japandi-sand/80 bg-japandi-cream/65 pr-10 text-japandi-stone placeholder:text-japandi-stone/45 focus-visible:border-japandi-sage focus-visible:ring-japandi-sage/30 sm:h-12 sm:text-base disabled:opacity-50"
                    disabled={isLoading}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                  />
                </FormControl>
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 min-h-[44px] min-w-[44px] -translate-y-1/2 text-japandi-timber/65 transition-colors hover:text-japandi-timber focus-visible:outline-none disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-xs text-red-600 dark:text-red-300" />
            </FormItem>
          )}
        />

        {/* Remember Me and Forgot Password - responsive layout */}
        <div className="flex flex-col items-start justify-between gap-2 xs:flex-row xs:items-center xs:gap-0">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    className="h-4 w-4 border-japandi-sand/90 bg-japandi-cream/70 data-[state=checked]:border-japandi-sage data-[state=checked]:bg-japandi-sage data-[state=checked]:text-white touch-manipulation disabled:opacity-50"
                    disabled={isLoading}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer text-xs font-normal text-japandi-stone/70 touch-manipulation sm:text-sm">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />

          <button
            className="text-xs text-japandi-timber/80 transition-colors hover:text-japandi-timber hover:underline touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            disabled={isLoading}
            onClick={() => {
              if (onForgotPassword) {
                onForgotPassword();
              } else {
                router.push('/auth/forgot-password');
              }
            }}
            type="button"
          >
            Forgot password?
          </button>
        </div>

        {/* API Error Message */}
        {loginMutation.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 sm:p-3">
            <p className="text-xs text-red-700 dark:text-red-300 sm:text-sm">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Login failed. Please check your credentials and try again.'}
            </p>
          </div>
        )}

        {/* Submit Button - blue gradient, touch-friendly */}
        <Button
          className="h-11 w-full bg-japandi-terracotta text-sm font-medium text-white shadow-sm shadow-japandi-timber/20 transition-colors hover:bg-japandi-timber focus-visible:ring-japandi-sage/40 touch-manipulation sm:h-12 sm:text-base disabled:opacity-70"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="hidden xs:inline">
                {isRedirecting ? 'Redirecting...' : 'Signing in...'}
              </span>
              <span className="xs:hidden">
                {isRedirecting ? 'Redirecting...' : 'Signing in...'}
              </span>
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign In
            </>
          )}
        </Button>

        {/* Switch to Sign Up */}
        <div className="text-center">
          <p className="text-xs text-japandi-stone/70 sm:text-sm">
            Don&apos;t have an account?{' '}
            <button
              className="font-medium text-japandi-timber underline-offset-4 hover:underline touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={onSwitchToSignUp}
              type="button"
            >
              Sign up
            </button>
          </p>
        </div>
      </form>
    </Form>
  );
}
