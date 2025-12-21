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
      <form className="space-y-3 sm:space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="email"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base disabled:opacity-50"
                    disabled={isLoading}
                    placeholder="john@example.com"
                    type="email"
                  />
                </FormControl>
              </div>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* Password */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white text-sm">Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="current-password"
                    className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-white/40 h-10 sm:h-11 text-sm sm:text-base disabled:opacity-50"
                    disabled={isLoading}
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                  />
                </FormControl>
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors touch-manipulation disabled:opacity-50"
                  disabled={isLoading}
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage className="text-red-300 text-xs" />
            </FormItem>
          )}
        />

        {/* Remember Me and Forgot Password - responsive layout */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-0">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-purple-600 touch-manipulation disabled:opacity-50"
                    disabled={isLoading}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-xs sm:text-sm text-white/70 font-normal cursor-pointer touch-manipulation">
                  Remember me
                </FormLabel>
              </FormItem>
            )}
          />

          <button
            className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2.5 sm:p-3">
            <p className="text-xs sm:text-sm text-red-300">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Login failed. Please check your credentials and try again.'}
            </p>
          </div>
        )}

        {/* Submit Button - blue gradient, touch-friendly */}
        <Button
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium touch-manipulation h-11 sm:h-12 text-sm sm:text-base shadow-lg shadow-blue-500/20 disabled:opacity-70"
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
          <p className="text-xs sm:text-sm text-white/70">
            Don&apos;t have an account?{' '}
            <button
              className="text-white font-medium hover:underline touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
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
