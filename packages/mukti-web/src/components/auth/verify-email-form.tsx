'use client';

import { AlertCircle, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler';

interface VerifyEmailFormProps {
  onSuccess: () => void;
  token: string;
}

/**
 * Email verification form component
 *
 * Features:
 * - Automatic verification on mount
 * - Resend verification email option
 * - Loading states
 * - Error handling with user-friendly messages
 * - Success callback
 *
 * @example
 * ```tsx
 * <VerifyEmailForm
 *   token="verification-token-from-email"
 *   onSuccess={() => router.push('/dashboard')}
 * />
 * ```
 */
export function VerifyEmailForm({ onSuccess, token }: VerifyEmailFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  /**
   * Verify email with token
   */
  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      await authApi.verifyEmail({ token });
      showSuccessToast('Email verified successfully! Welcome to Mukti.');
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify email';
      setError(errorMessage);
      showErrorToast(err);
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Resend verification email
   */
  const handleResend = async () => {
    if (!userEmail) {
      setError('Please enter your email address');
      showErrorToast('Please enter your email address');
      return;
    }

    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await authApi.resendVerification({ email: userEmail });
      setResendSuccess(true);
      showSuccessToast('Verification email sent! Please check your inbox.');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to resend verification email';
      setError(errorMessage);
      showErrorToast(err);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-purple-500/20 p-3">
            <Mail className="h-8 w-8 text-purple-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
        <p className="text-sm text-white/70">Click the button below to verify your email address</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message for resend */}
      {resendSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-200">
                Verification email sent! Please check your inbox.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verify button */}
      <Button
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
        disabled={isVerifying}
        onClick={handleVerify}
        size="lg"
        type="button"
      >
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Email'
        )}
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-black/20 px-2 text-white/50">Didn&apos;t receive the email?</span>
        </div>
      </div>

      {/* Resend section */}
      <div className="space-y-3">
        <input
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="Enter your email"
          type="email"
          value={userEmail}
        />
        <Button
          className="w-full border border-white/20 bg-white/5 hover:bg-white/10 text-white"
          disabled={isResending || !userEmail}
          onClick={handleResend}
          size="lg"
          type="button"
          variant="outline"
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Resend Verification Email'
          )}
        </Button>
      </div>
    </div>
  );
}
