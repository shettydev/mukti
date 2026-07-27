/**
 * Local-mode onboarding state.
 *
 * @remarks
 * Drives the first-run welcome tour shown only in local mode. "Seen" is a
 * `localStorage` flag so it persists across restarts for the single local user
 * and is trivial to reset. The store lets the sidebar re-open the tour on demand.
 */

import { create } from 'zustand';

interface OnboardingState {
  /** Close the tour and mark it seen. */
  close: () => void;
  /** Whether the tour overlay is currently open. */
  isOpen: boolean;
  /** Open (or re-open) the tour. */
  open: () => void;
}

/** localStorage key marking the welcome tour as seen. */
export const ONBOARDING_SEEN_KEY = 'mukti_local_onboarding_seen';

/** Whether the welcome tour has been dismissed before. */
export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') {
    return true; // never auto-open during SSR
  }
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  close: () => {
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // Ignore storage failures; the tour simply reappears next load.
    }
    set({ isOpen: false });
  },
  isOpen: false,
  open: () => set({ isOpen: true }),
}));
