'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { GradientBackground } from '@/components/auth/gradient-background';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Reset password page
 *
 * Features:
 * - Animated gradient background
 * - Token validation from URL query params
 * - Reset password form
 * - Success state with confirmation
 * - Error state for invalid/expired tokens
 * - Responsive design
 *
 * @example
 * Navigate to: /auth/reset-password?token=abc123
 */
export default function ResetPasswordPage() {
  return (
    <GradientBackground>
      <div className="w-full max-w-md">
        <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
          <Suspense fallback={<ResetPasswordLoading />}>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </GradientBackground>
  );
}

/**
 * Reset password page content component
 * Separated to handle useSearchParams() which requires Suspense
 */
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle missing token
  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/20 p-3">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">Invalid Link</h3>
          <p className="text-sm text-white/70">
            This password reset link is invalid or has expired.
          </p>
          <p className="text-sm text-white/60">Please request a new password reset link.</p>
        </div>

        <Button
          asChild
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
          size="lg"
        >
          <Link href="/auth/forgot-password">Request New Link</Link>
        </Button>
      </div>
    );
  }

  // Handle success state
  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-500/20 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-white">Password reset successful!</h3>
          <p className="text-sm text-white/70">Your password has been reset successfully.</p>
          <p className="text-sm text-white/60">You can now sign in with your new password.</p>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
          onClick={() => router.push('/')}
          size="lg"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  // Show reset password form
  return <ResetPasswordForm onSuccess={() => setIsSuccess(true)} token={token} />;
}

/**
 * Loading fallback for Suspense
 */
function ResetPasswordLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center mb-6">
        <Skeleton className="h-7 w-48 mx-auto bg-white/10" />
        <Skeleton className="h-4 w-full bg-white/10" />
      </div>
      <Skeleton className="h-10 w-full bg-white/10" />
      <Skeleton className="h-24 w-full bg-white/10" />
      <Skeleton className="h-10 w-full bg-white/10" />
      <Skeleton className="h-12 w-full bg-white/10" />
    </div>
  );
}
