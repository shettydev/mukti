import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

import type { DialogueMessage } from '../../schemas/dialogue-message.schema';

import { isLocalMode } from '../../common/config/local-mode';
import { ConversationService } from '../conversations/services/conversation.service';
import { MessageService } from '../conversations/services/message.service';
import { DialogueService } from '../dialogue/services/dialogue.service';
import { getRecommendedTechnique } from '../dialogue/utils/prompt-builder';
import { ThoughtMapDialogueQueueService } from '../thought-map/services/thought-map-dialogue-queue.service';
import { ThoughtMapService } from '../thought-map/services/thought-map.service';
import {
  assembleExport,
  type SourceDialogue,
  type SourceMessage,
} from './assemble-export';
import { sanitizeExport } from './sanitize-export';
import {
  type ExportMode,
  type SessionExport,
  STUDY_ARMS,
  type StudyArm,
} from './session-export.types';

/** Which dialogue to export, by surface. */
export type ExportTarget =
  | { conversationId: string; surface: 'chat' }
  | { mapId: string; nodeId: string; surface: 'thought_map_node' }
  | { nodeId: string; sessionId: string; surface: 'canvas_node' };

/**
 * Builds session exports (session-export spec).
 *
 * @remarks
 * Loads a dialogue through the same ownership checks the existing GET
 * handlers use, so a dialogue the user does not own fails the same way it
 * does there, then hands the stored messages to the pure
 * {@link assembleExport}. Reads other domains through their services only.
 */
@Injectable()
export class SessionExportService {
  private readonly muktiVersion = readMuktiVersion();

  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly dialogueService: DialogueService,
    private readonly thoughtMapService: ThoughtMapService,
    private readonly thoughtMapDialogueQueueService: ThoughtMapDialogueQueueService,
  ) {}

  /**
   * The export model for one dialogue, sanitized as requested.
   *
   * @throws {NotFoundException} when the dialogue does not exist, including a
   *   node that has never been talked to.
   * @throws {ForbiddenException} when another user owns it (the controller
   *   answers both with not found).
   */
  async buildModel(
    target: ExportTarget,
    userId: string,
    options: {
      mode: ExportMode;
      privateValues?: string[];
      redact: string[];
    } = {
      mode: 'full',
      redact: [],
    },
  ): Promise<SessionExport> {
    const source = await this.loadSource(target, userId);
    const model = assembleExport(source, {
      exportedAt: new Date(),
      exportId: randomUUID(),
    });
    return sanitizeExport(model, options);
  }

  private async loadCanvasNode(
    sessionId: string,
    nodeId: string,
    userId: string,
  ): Promise<SourceDialogue> {
    const session = await this.dialogueService.validateSessionOwnership(
      sessionId,
      userId,
    );
    const dialogue = await this.dialogueService.getDialogue(sessionId, nodeId);
    if (!dialogue) {
      throw new NotFoundException('This node has no dialogue to export');
    }
    const messages = await this.dialogueService.getAllMessages(dialogue._id);

    return {
      dialogueTitle: session.problemStructure?.seed,
      messages: messages.map(fromDialogueMessage),
      mode: deploymentMode(),
      muktiVersion: this.muktiVersion,
      nodeLabel: dialogue.nodeLabel,
      nodeType: dialogue.nodeType,
      surface: 'canvas_node',
      technique: getRecommendedTechnique(dialogue.nodeType),
    };
  }

  private async loadChat(
    conversationId: string,
    userId: string,
  ): Promise<SourceDialogue> {
    const conversation = await this.conversationService.findConversationById(
      conversationId,
      userId,
    );
    const archived = conversation.hasArchivedMessages
      ? await this.messageService.getAllArchivedMessages(conversationId)
      : [];

    const messages: SourceMessage[] = [
      ...archived.map((m) => ({
        content: m.content,
        meta: m.metadata,
        role: m.role,
        timestamp: m.timestamp,
      })),
      ...conversation.recentMessages.map((m) => ({
        content: m.content,
        meta: m.metadata,
        role: m.role,
        timestamp: m.timestamp,
      })),
    ];

    return {
      dialogueTitle: conversation.title,
      messages,
      mode: deploymentMode(),
      muktiVersion: this.muktiVersion,
      studyArm: studyArmOf(conversation),
      surface: 'chat',
      technique: conversation.studyArm ? null : conversation.technique,
    };
  }

  private async loadSource(
    target: ExportTarget,
    userId: string,
  ): Promise<SourceDialogue> {
    switch (target.surface) {
      case 'canvas_node':
        return this.loadCanvasNode(target.sessionId, target.nodeId, userId);
      case 'chat':
        return this.loadChat(target.conversationId, userId);
      case 'thought_map_node':
        return this.loadThoughtMapNode(target.mapId, target.nodeId, userId);
    }
  }

  private async loadThoughtMapNode(
    mapId: string,
    nodeId: string,
    userId: string,
  ): Promise<SourceDialogue> {
    const map = await this.thoughtMapService.findMapById(mapId, userId);
    const dialogue = await this.thoughtMapDialogueQueueService.findMapDialogue(
      mapId,
      nodeId,
    );
    if (!dialogue) {
      throw new NotFoundException('This node has no dialogue to export');
    }
    const messages = await this.dialogueService.getAllMessages(dialogue._id);

    return {
      dialogueTitle: map.title,
      messages: messages.map(fromDialogueMessage),
      mode: deploymentMode(),
      muktiVersion: this.muktiVersion,
      nodeLabel: dialogue.nodeLabel,
      nodeType: dialogue.nodeType,
      surface: 'thought_map_node',
      // A map node's technique depends on where it sat in the map when each
      // turn ran, which is not recorded; reported as null, not guessed.
      technique: null,
    };
  }
}

function deploymentMode(): 'hosted' | 'local' {
  return isLocalMode() ? 'local' : 'hosted';
}

function fromDialogueMessage(m: DialogueMessage): SourceMessage {
  const { tokens, ...meta } = m.metadata ?? {};
  return {
    content: m.content,
    // Node dialogues store the total as `tokens`
    meta: m.metadata ? { ...meta, totalTokens: tokens } : undefined,
    role: m.role,
    timestamp: m.createdAt,
  };
}

/** The API's own package version, read once. */
function readMuktiVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '../../../package.json'), 'utf8'),
    ) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** The study arm a conversation was created under, if any. */
function studyArmOf(conversation: {
  studyArm?: { name?: string; promptSha256?: string };
}): SourceDialogue['studyArm'] {
  const arm = conversation.studyArm;
  if (
    arm?.name &&
    arm.promptSha256 &&
    (STUDY_ARMS as readonly string[]).includes(arm.name)
  ) {
    return { name: arm.name as StudyArm, promptSha256: arm.promptSha256 };
  }
  return undefined;
}
