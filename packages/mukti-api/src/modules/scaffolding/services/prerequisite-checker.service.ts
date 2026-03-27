import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Concept, ConceptDocument } from '../../../schemas/concept.schema';
import {
  KnowledgeState,
  KnowledgeStateDocument,
} from '../../../schemas/knowledge-state.schema';

/**
 * Result of the full gap check operation.
 */
export interface GapCheckResult {
  maxDepthReached: boolean;
  missingPrerequisites: string[];
  prerequisiteChain: PrerequisiteCheckResult[];
  rootGap: null | string;
}

/**
 * Result of checking a single prerequisite.
 */
export interface PrerequisiteCheckResult {
  conceptId: string;
  isMastered: boolean;
  missingPrerequisites: PrerequisiteCheckResult[];
  probability: number;
}

/**
 * Mastery thresholds for prerequisite checking.
 */
export const MASTERY_THRESHOLDS = {
  /** P(L) threshold below which concept is considered not mastered */
  MASTERY_MIN: 0.6,
  /** Maximum recursion depth for prerequisite checking */
  MAX_DEPTH: 3,
} as const;

/**
 * Prerequisite Checker Service - RFC-0001
 *
 * Performs recursive prerequisite checking to find the root knowledge gap.
 * When a concept appears to have gaps, this service traverses the prerequisite
 * graph (up to depth 3) to identify foundational concepts that may be missing.
 *
 * @remarks
 * This service follows the BFS-like approach: for each unmastered prerequisite,
 * we check ITS prerequisites recursively until we find mastered concepts or
 * hit the depth limit.
 *
 * Example prerequisite chain:
 * recursion_concepts (target)
 *   └── function_concepts (missing, P(L)=0.3)
 *       └── variable_concepts (mastered, P(L)=0.8)
 *
 * In this case, rootGap = "function_concepts"
 */
@Injectable()
export class PrerequisiteCheckerService {
  private readonly logger = new Logger(PrerequisiteCheckerService.name);

  constructor(
    @InjectModel(KnowledgeState.name)
    private readonly knowledgeStateModel: Model<KnowledgeStateDocument>,
    @InjectModel(Concept.name)
    private readonly conceptModel: Model<ConceptDocument>,
  ) {}

  /**
   * Check multiple concepts and find all root gaps.
   *
   * @param conceptIds - Array of concept IDs to check
   * @param userId - User ID for knowledge state lookup
   * @returns Combined gap check result
   */
  async checkMultiple(
    conceptIds: string[],
    userId: string,
  ): Promise<GapCheckResult> {
    if (!conceptIds.length) {
      return {
        maxDepthReached: false,
        missingPrerequisites: [],
        prerequisiteChain: [],
        rootGap: null,
      };
    }

    const allMissing: string[] = [];
    const allChains: PrerequisiteCheckResult[] = [];
    let deepestRootGap: null | string = null;
    let anyMaxDepthReached = false;

    // Check each concept
    for (const conceptId of conceptIds) {
      const result = await this.recursiveCheck(conceptId, userId);

      // Collect missing prerequisites (deduplicated)
      for (const missing of result.missingPrerequisites) {
        if (!allMissing.includes(missing)) {
          allMissing.push(missing);
        }
      }

      // Collect chains
      allChains.push(...result.prerequisiteChain);

      // Track root gap (prefer deepest/first found)
      if (result.rootGap && !deepestRootGap) {
        deepestRootGap = result.rootGap;
      }

      if (result.maxDepthReached) {
        anyMaxDepthReached = true;
      }
    }

    return {
      maxDepthReached: anyMaxDepthReached,
      missingPrerequisites: allMissing,
      prerequisiteChain: allChains,
      rootGap: deepestRootGap,
    };
  }

  /**
   * Get the learning path to address a root gap.
   * Returns prerequisites in order (from foundational to target).
   *
   * @param rootGap - The root concept to build path from
   * @param targetConcept - The target concept user is trying to learn
   * @returns Array of concept IDs in learning order
   */
  async getLearningPath(
    rootGap: string,
    targetConcept: string,
  ): Promise<string[]> {
    const path: string[] = [];
    const visited = new Set<string>();

    // BFS from rootGap to targetConcept
    const buildPath = async (
      conceptId: string,
      depth: number,
    ): Promise<boolean> => {
      if (visited.has(conceptId) || depth > MASTERY_THRESHOLDS.MAX_DEPTH) {
        return false;
      }
      visited.add(conceptId);

      // Found target
      if (conceptId === targetConcept) {
        path.push(conceptId);
        return true;
      }

      // Find concepts that have this as a prerequisite
      const dependents = await this.conceptModel
        .find({ prerequisites: conceptId })
        .select('conceptId')
        .lean();

      for (const dependent of dependents) {
        const found = await buildPath(dependent.conceptId, depth + 1);
        if (found) {
          path.unshift(conceptId);
          return true;
        }
      }

      return false;
    };

    await buildPath(rootGap, 0);

    return path;
  }

  /**
   * Perform recursive prerequisite check for a concept.
   *
   * @param conceptId - The concept to check prerequisites for
   * @param userId - User ID for knowledge state lookup
   * @param depth - Current recursion depth (default 0)
   * @param maxDepth - Maximum recursion depth (default 3, per RFC-0001)
   * @returns GapCheckResult with root gap and missing prerequisites chain
   */
  async recursiveCheck(
    conceptId: string,
    userId: string,
    depth = 0,
    maxDepth: number = MASTERY_THRESHOLDS.MAX_DEPTH,
  ): Promise<GapCheckResult> {
    const userObjectId = this.toObjectId(userId);

    const visited = new Set<string>();
    const missingPrereqs: string[] = [];
    const chain: PrerequisiteCheckResult[] = [];
    let rootGap: null | string = null;
    let maxDepthReached = false;

    // Recursive helper function
    const checkConcept = async (
      cid: string,
      currentDepth: number,
    ): Promise<null | PrerequisiteCheckResult> => {
      // Prevent cycles and respect depth limit
      if (visited.has(cid) || currentDepth > maxDepth) {
        if (currentDepth > maxDepth) {
          maxDepthReached = true;
        }
        return null;
      }
      visited.add(cid);

      // Get concept from database
      const concept = await this.conceptModel
        .findOne({ conceptId: cid })
        .select('conceptId prerequisites')
        .lean();

      if (!concept) {
        this.logger.warn(`Concept not found: ${cid}`);
        return null;
      }

      // Get user's knowledge state for this concept
      const state = await this.knowledgeStateModel
        .findOne({
          conceptId: cid,
          userId: userObjectId,
        })
        .select('currentProbability')
        .lean();

      const probability = state?.currentProbability ?? 0.3;
      const isMastered = probability >= MASTERY_THRESHOLDS.MASTERY_MIN;

      const result: PrerequisiteCheckResult = {
        conceptId: cid,
        isMastered,
        missingPrerequisites: [],
        probability,
      };

      // If not mastered, check prerequisites recursively
      if (!isMastered) {
        missingPrereqs.push(cid);

        // Track deepest unmastered concept as root gap
        if (currentDepth > 0 && !rootGap) {
          rootGap = cid;
        }

        // Check this concept's prerequisites
        if (concept.prerequisites?.length && currentDepth < maxDepth) {
          for (const prereqId of concept.prerequisites) {
            const prereqResult = await checkConcept(prereqId, currentDepth + 1);
            if (prereqResult) {
              result.missingPrerequisites.push(prereqResult);

              // Update root gap if we found a deeper unmastered prerequisite
              if (!prereqResult.isMastered) {
                rootGap = prereqResult.conceptId;
              }
            }
          }
        }
      }

      return result;
    };

    // Start recursive check from the target concept
    const rootResult = await checkConcept(conceptId, depth);
    if (rootResult) {
      chain.push(rootResult);
    }

    // Log results
    this.logger.debug(
      `Prerequisite check for ${conceptId}: ` +
        `rootGap=${rootGap ?? 'none'}, ` +
        `missing=${missingPrereqs.length}, ` +
        `maxDepthReached=${maxDepthReached}`,
    );

    return {
      maxDepthReached,
      missingPrerequisites: missingPrereqs,
      prerequisiteChain: chain,
      rootGap,
    };
  }

  private toObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid userId format: ${userId}`);
    }
    return new Types.ObjectId(userId);
  }
}
