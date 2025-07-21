import { useState, useCallback } from 'react';

interface WaitlistEntry {
  exists: boolean;
  joinedAt: string | null;
}

interface UseWaitlistReturn {
  isLoading: boolean;
  isSubmitted: boolean;
  error: string | null;
  isExisting: boolean;
  checkEmail: (email: string) => Promise<boolean>;
  joinWaitlist: (email: string) => Promise<boolean>;
  reset: () => void;
}

export function useWaitlist(): UseWaitlistReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExisting, setIsExisting] = useState(false);

  const checkEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      setError(null);
      const response = await fetch(`/api/waitlist?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check email');
      }

      setIsExisting(data.exists);
      return data.exists;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check email';
      setError(errorMessage);
      return false;
    }
  }, []);

  const joinWaitlist = useCallback(async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.isExisting) {
          setIsExisting(true);
          setError('You are already on the waitlist!');
        } else {
          throw new Error(data.error || 'Failed to join waitlist');
        }
        return false;
      }

      setIsSubmitted(true);
      setIsExisting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join waitlist';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsSubmitted(false);
    setError(null);
    setIsExisting(false);
  }, []);

  return {
    isLoading,
    isSubmitted,
    error,
    isExisting,
    checkEmail,
    joinWaitlist,
    reset,
  };
}
