'use client';

import { useCallback, useEffect, useRef } from 'react';

import { requestDataDisclosure } from '@/lib/stores/data-disclosure-store';

/** Gate every node send, including opening questions, wrap-up and resend. */
export function useDisclosureGatedSend<Args extends unknown[]>(send: (...args: Args) => void) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(
    (...args: Args) => {
      return requestDataDisclosure().then((allowed) => {
        if (!allowed || !mounted.current) {
          return false;
        }
        send(...args);
        return true;
      });
    },
    [send]
  );
}
