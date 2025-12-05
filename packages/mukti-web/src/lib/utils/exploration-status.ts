/**
 * Exploration status utilities for Thinking Canvas
 * Provides functions to track and calculate node exploration progress
 */

import type { NodeDialogue } from '@/types/dialogue.types';

/**
 * Minimum message count to consider a node as explored
 * A node is considered explored when it has at least this many messages
 */
export const MIN_MESSAGES_FOR_EXPLORED = 2;

/**
 * Completion status for canvas exploration
 * @property exploredCount - Number of root nodes that have been explored
 * @property isComplete - Whether all root nodes have been explored
 * @property percentage - Completion percentage (0-100)
 * @property totalRoots - Total number of root nodes
 */
export interface CompletionStatus {
  exploredCount: number;
  isComplete: boolean;
  percentage: number;
  totalRoots: number;
}

/**
 * Calculates the completion status based on explored root nodes
 * Completion is determined by how many Root (assumption) nodes have been explored
 *
 * @param roots - Array of root labels (assumptions)
 * @param dialogues - Array of node dialogues or Map of nodeId to dialogue
 * @returns Completion status object with counts and percentage
 *
 * @example
 * ```typescript
 * const status = calculateCompletionStatus(session.problemStructure.roots, dialogues);
 * if (status.isComplete) {
 *   // Show completion indicator
 * }
 * console.log(`${status.percentage}% complete`);
 * ```
 */
export function calculateCompletionStatus(
  roots: string[],
  dialogues: Map<string, NodeDialogue> | NodeDialogue[]
): CompletionStatus {
  const totalRoots = roots.length;

  if (totalRoots === 0) {
    return {
      exploredCount: 0,
      isComplete: true,
      percentage: 100,
      totalRoots: 0,
    };
  }

  // Count explored root nodes
  let exploredCount = 0;
  for (let i = 0; i < totalRoots; i++) {
    const nodeId = `root-${i}`;
    if (isNodeExplored(nodeId, dialogues)) {
      exploredCount++;
    }
  }

  const percentage = Math.round((exploredCount / totalRoots) * 100);
  const isComplete = exploredCount === totalRoots;

  return {
    exploredCount,
    isComplete,
    percentage,
    totalRoots,
  };
}

/**
 * Converts an array of dialogues to a Map for efficient lookup
 *
 * @param dialogues - Array of node dialogues
 * @returns Map with nodeId as key and dialogue as value
 */
export function dialoguesToMap(dialogues: NodeDialogue[]): Map<string, NodeDialogue> {
  const map = new Map<string, NodeDialogue>();
  for (const dialogue of dialogues) {
    map.set(dialogue.nodeId, dialogue);
  }
  return map;
}

/**
 * Gets exploration statistics for all node types
 *
 * @param problemStructure - The problem structure with seed, soil, and roots
 * @param dialogues - Array of node dialogues or Map of nodeId to dialogue
 * @returns Object with exploration counts for each node type
 */
export function getExplorationStats(
  problemStructure: { roots: string[]; seed: string; soil: string[] },
  dialogues: Map<string, NodeDialogue> | NodeDialogue[]
): {
  roots: { explored: number; total: number };
  seed: { explored: boolean };
  soil: { explored: number; total: number };
} {
  // Check seed exploration
  const seedExplored = isNodeExplored('seed', dialogues);

  // Count explored soil nodes
  let soilExploredCount = 0;
  for (let i = 0; i < problemStructure.soil.length; i++) {
    if (isNodeExplored(`soil-${i}`, dialogues)) {
      soilExploredCount++;
    }
  }

  // Count explored root nodes
  let rootExploredCount = 0;
  for (let i = 0; i < problemStructure.roots.length; i++) {
    if (isNodeExplored(`root-${i}`, dialogues)) {
      rootExploredCount++;
    }
  }

  return {
    roots: { explored: rootExploredCount, total: problemStructure.roots.length },
    seed: { explored: seedExplored },
    soil: { explored: soilExploredCount, total: problemStructure.soil.length },
  };
}

/**
 * Gets the message count for a specific node
 *
 * @param nodeId - The node ID to check
 * @param dialogues - Array of node dialogues or Map of nodeId to dialogue
 * @returns The number of messages for the node, or 0 if no dialogue exists
 */
export function getNodeMessageCount(
  nodeId: string,
  dialogues: Map<string, NodeDialogue> | NodeDialogue[]
): number {
  if (Array.isArray(dialogues)) {
    const dialogue = dialogues.find((d) => d.nodeId === nodeId);
    return dialogue?.messageCount ?? 0;
  }

  const dialogue = dialogues.get(nodeId);
  return dialogue?.messageCount ?? 0;
}

/**
 * Checks if a specific node has been explored through dialogue
 *
 * @param nodeId - The node ID to check (e.g., 'seed', 'soil-0', 'root-1')
 * @param dialogues - Array of node dialogues or Map of nodeId to dialogue
 * @returns True if the node has been explored (has dialogue with messages)
 *
 * @example
 * ```typescript
 * const explored = isNodeExplored('root-0', dialogues);
 * if (explored) {
 *   // Show explored indicator
 * }
 * ```
 */
export function isNodeExplored(
  nodeId: string,
  dialogues: Map<string, NodeDialogue> | NodeDialogue[]
): boolean {
  if (Array.isArray(dialogues)) {
    const dialogue = dialogues.find((d) => d.nodeId === nodeId);
    return dialogue !== undefined && dialogue.messageCount >= MIN_MESSAGES_FOR_EXPLORED;
  }

  const dialogue = dialogues.get(nodeId);
  return dialogue !== undefined && dialogue.messageCount >= MIN_MESSAGES_FOR_EXPLORED;
}
