/**
 * Keyboard shortcuts hook for dashboard navigation
 *
 * Provides global keyboard shortcuts:
 * - Cmd/Ctrl+K: Open conversation search
 * - Cmd/Ctrl+N: Open new conversation dialog
 * - Cmd/Ctrl+B: Toggle sidebar collapse
 * - Escape: Close open dialogs
 *
 */

'use client';

import { useCallback, useEffect } from 'react';

interface KeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Callback when Cmd/Ctrl+N is pressed (new conversation) */
  onNewConversation?: () => void;
  /** Callback when Cmd/Ctrl+K is pressed (search) */
  onSearch?: () => void;
  /** Callback when Cmd/Ctrl+B is pressed (toggle sidebar) */
  onToggleSidebar?: () => void;
}

/**
 * Format keyboard shortcut for display
 * Returns platform-specific modifier key (⌘ for Mac, Ctrl for others)
 */
export function formatShortcut(key: string): string {
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl';
  return `${modifier}+${key.toUpperCase()}`;
}

/**
 * Hook for handling global keyboard shortcuts
 *
 * @param options - Keyboard shortcut callbacks
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onSearch: () => setSearchOpen(true),
 *   onNewConversation: () => setCreateDialogOpen(true),
 *   onEscape: () => closeAllDialogs(),
 * });
 * ```
 */
export function useKeyboardShortcuts({
  enabled = true,
  onEscape,
  onNewConversation,
  onSearch,
  onToggleSidebar,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd/Ctrl+K - Search (works even in input fields)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onSearch?.();
        return;
      }

      // Cmd/Ctrl+N - New conversation (works even in input fields)
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        onNewConversation?.();
        return;
      }

      // Cmd/Ctrl+B - Toggle sidebar (works even in input fields)
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        onToggleSidebar?.();
        return;
      }

      // Escape - Close dialogs (only when not in input fields)
      if (event.key === 'Escape' && !isInputField) {
        event.preventDefault();
        onEscape?.();
        return;
      }
    },
    [enabled, onSearch, onNewConversation, onToggleSidebar, onEscape]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}
