import { useCallback, useState } from 'react';

import { apiClient, ApiClientError } from '@/lib/api/client';

interface UseWaitlistReturn {
  checkEmail: (email: string) => Promise<boolean>;
  error: null | string;
  isExisting: boolean;
  isLoading: boolean;
  isSubmitted: boolean;
  joinWaitlist: (email: string) => Promise<boolean>;
  reset: () => void;
}

interface WaitlistCheckResponse {
  email: string;
  exists: boolean;
  joinedAt: string;
}

export function useWaitlist(): UseWaitlistReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<null | string>(null);
  const [isExisting, setIsExisting] = useState(false);

  const checkEmail = useCallback(async (email: string): Promise<boolean> => {
    try {
      setError(null);
      const data = await apiClient.get<WaitlistCheckResponse>(
        `/waitlist/check?email=${encodeURIComponent(email)}`
      );

      setIsExisting(data.exists);
      return data.exists;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setIsExisting(false);
        return false;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to check email';
      setError(errorMessage);
      return false;
    }
  }, []);

  const joinWaitlist = useCallback(async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsExisting(false);

      await apiClient.post('/waitlist/join', { email });
      setIsSubmitted(true);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setIsExisting(true);
        setError('You are already on the waitlist!');
        return false;
      }

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
    checkEmail,
    error,
    isExisting,
    isLoading,
    isSubmitted,
    joinWaitlist,
    reset,
  };
}
