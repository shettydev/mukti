import { create } from 'zustand';

import { isLocalMode } from '@/lib/config';

export const DISCLOSURE_SEEN_KEY = 'mukti_local_data_disclosure_seen';
let resolvePending: ((allowed: boolean) => void) | null = null;
let seenThisSession = false;

interface DataDisclosureState {
  close: () => void;
  continue: () => void;
  isOpen: boolean;
}

function finish(allowed: boolean) {
  const resolve = resolvePending;
  resolvePending = null;
  useDataDisclosureStore.setState({ isOpen: false });
  resolve?.(allowed);
}

export const useDataDisclosureStore = create<DataDisclosureState>(() => ({
  close: () => finish(false),
  continue: () => {
    seenThisSession = true;
    try {
      localStorage.setItem(DISCLOSURE_SEEN_KEY, '1');
    } catch {
      // Continue for this session even when browser storage is unavailable.
    }
    finish(true);
  },
  isOpen: false,
}));

/** Hold one send before first local use. Dismissal never authorizes a send. */
export function requestDataDisclosure(): Promise<boolean> {
  if (!isLocalMode()) {
    return Promise.resolve(true);
  }
  try {
    if (localStorage.getItem(DISCLOSURE_SEEN_KEY) === '1') {
      return Promise.resolve(true);
    }
    // Reading storage works: it remains the source of truth, including resets.
    seenThisSession = false;
  } catch {
    if (seenThisSession) {
      return Promise.resolve(true);
    }
  }
  if (resolvePending) {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    resolvePending = resolve;
    useDataDisclosureStore.setState({ isOpen: true });
  });
}
