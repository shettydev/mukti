/**
 * Chat store using Zustand
 * Manages the state for the Context-aware Chat panel
 *
 * @remarks
 * - Handles active node dialogue state
 * - Manages messages per node (cached locally)
 * - Controls chat panel width with constraints
 * - Provides actions for node switching and message management
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { DialogueMessage } from '@/types/dialogue.types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Minimum panel width in pixels
 */
export const MIN_PANEL_WIDTH = 320;

/**
 * Maximum panel width in pixels
 */
export const MAX_PANEL_WIDTH = 600;

/**
 * Default panel width in pixels
 */
export const DEFAULT_PANEL_WIDTH = 400;

/**
 * LocalStorage key for persisting panel width preference
 */
const PANEL_WIDTH_STORAGE_KEY = 'mukti-chat-panel-width';

// ============================================================================
// Types
// ============================================================================

/**
 * Chat state interface
 * @property activeNodeId - Currently selected node ID for dialogue
 * @property isLoading - Whether a message is being sent/loaded
 * @property messages - Map of nodeId to messages array (local cache)
 * @property panelWidth - Current chat panel width in pixels
 */
interface ChatState {
  // State
  activeNodeId: null | string;
  // Actions
  addMessage: (nodeId: string, message: DialogueMessage) => void;
  clearNodeMessages: (nodeId: string) => void;
  isLoading: boolean;

  messages: Map<string, DialogueMessage[]>;
  panelWidth: number;
  setActiveNode: (nodeId: null | string) => void;
  setLoading: (loading: boolean) => void;
  setMessages: (nodeId: string, messages: DialogueMessage[]) => void;
  setPanelWidth: (width: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clamps panel width between MIN_PANEL_WIDTH and MAX_PANEL_WIDTH
 * @param width - The width to clamp
 * @returns Clamped width value
 */
function clampPanelWidth(width: number): number {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
}

/**
 * Gets the initial panel width from localStorage or returns default
 * @returns Initial panel width
 */
function getInitialPanelWidth(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_PANEL_WIDTH;
  }

  const stored = localStorage.getItem(PANEL_WIDTH_STORAGE_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) {
      return clampPanelWidth(parsed);
    }
  }

  return DEFAULT_PANEL_WIDTH;
}

/**
 * Persists panel width to localStorage
 * @param width - The width to persist
 */
function persistPanelWidth(width: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(width));
  }
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial state for the chat store
 */
const initialState = {
  activeNodeId: null as null | string,
  isLoading: false,
  messages: new Map<string, DialogueMessage[]>(),
  panelWidth: DEFAULT_PANEL_WIDTH,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Chat store for managing the Context-aware Chat panel state
 *
 * @example
 * ```typescript
 * const { activeNodeId, setActiveNode, messages } = useChatStore();
 *
 * // Select a node for dialogue
 * setActiveNode('root-0');
 *
 * // Get messages for active node
 * const nodeMessages = messages.get(activeNodeId) ?? [];
 *
 * // Deselect node
 * setActiveNode(null);
 * ```
 */
export const useChatStore = create<ChatState>()((set) => ({
  ...initialState,
  /**
   * Add a message to a node's dialogue
   * @param nodeId - The node ID to add the message to
   * @param message - The message to add
   */
  addMessage: (nodeId: string, message: DialogueMessage) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      const existing = newMessages.get(nodeId) ?? [];
      newMessages.set(nodeId, [...existing, message]);
      return { messages: newMessages };
    });
  },

  /**
   * Clear all messages for a specific node
   * @param nodeId - The node ID to clear messages for
   */
  clearNodeMessages: (nodeId: string) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.delete(nodeId);
      return { messages: newMessages };
    });
  },

  panelWidth: getInitialPanelWidth(),

  /**
   * Set the active node for dialogue
   * Preserves previous node's dialogue state when switching
   * @param nodeId - Node ID to select, or null to deselect
   */
  setActiveNode: (nodeId: null | string) => {
    set({ activeNodeId: nodeId });
  },

  /**
   * Set the loading state
   * @param loading - Whether a message is being sent/loaded
   */
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  /**
   * Set all messages for a node (used when loading from API)
   * @param nodeId - The node ID to set messages for
   * @param messages - The messages array to set
   */
  setMessages: (nodeId: string, messages: DialogueMessage[]) => {
    set((state) => {
      const newMessages = new Map(state.messages);
      newMessages.set(nodeId, messages);
      return { messages: newMessages };
    });
  },

  /**
   * Set the panel width with clamping and persistence
   * @param width - The desired panel width
   */
  setPanelWidth: (width: number) => {
    const clampedWidth = clampPanelWidth(width);
    persistPanelWidth(clampedWidth);
    set({ panelWidth: clampedWidth });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the active node ID
 */
export const useActiveNodeId = () => useChatStore((state) => state.activeNodeId);

/**
 * Get the loading state
 */
export const useChatLoading = () => useChatStore((state) => state.isLoading);

/**
 * Get the panel width
 */
export const usePanelWidth = () => useChatStore((state) => state.panelWidth);

/**
 * Get messages for the active node
 */
export const useActiveNodeMessages = () =>
  useChatStore((state) => {
    if (!state.activeNodeId) {
      return [];
    }
    return state.messages.get(state.activeNodeId) ?? [];
  });

/**
 * Get messages for a specific node
 * @param nodeId - The node ID to get messages for
 */
export const useNodeMessages = (nodeId: null | string) =>
  useChatStore((state) => {
    if (!nodeId) {
      return [];
    }
    return state.messages.get(nodeId) ?? [];
  });

/**
 * Check if a node has any messages
 * @param nodeId - The node ID to check
 */
export const useHasNodeMessages = (nodeId: null | string) =>
  useChatStore((state) => {
    if (!nodeId) {
      return false;
    }
    const messages = state.messages.get(nodeId);
    return messages !== undefined && messages.length > 0;
  });

/**
 * Get chat actions
 * Uses useShallow to prevent infinite re-renders
 */
export const useChatActions = () =>
  useChatStore(
    useShallow((state) => ({
      addMessage: state.addMessage,
      clearNodeMessages: state.clearNodeMessages,
      setActiveNode: state.setActiveNode,
      setLoading: state.setLoading,
      setMessages: state.setMessages,
      setPanelWidth: state.setPanelWidth,
    }))
  );
