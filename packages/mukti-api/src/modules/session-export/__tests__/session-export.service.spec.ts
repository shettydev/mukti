import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { SessionExportService } from '../session-export.service';

/**
 * SessionExportService over mocked domain services: each surface loads
 * through its owner's lookup, so ownership failures surface unchanged.
 */
describe('SessionExportService', () => {
  const USER = '507f1f77bcf86cd799439011';
  const t = (s: number) => new Date(Date.UTC(2026, 10, 16, 9, 0, s));

  const conversationService = { findConversationById: jest.fn() };
  const messageService = { getAllArchivedMessages: jest.fn() };
  const dialogueService = {
    getAllMessages: jest.fn(),
    getDialogue: jest.fn(),
    validateSessionOwnership: jest.fn(),
  };
  const thoughtMapService = { findMapById: jest.fn() };
  const thoughtMapQueue = { findMapDialogue: jest.fn() };

  const service = new SessionExportService(
    conversationService as any,
    messageService as any,
    dialogueService as any,
    thoughtMapService as any,
    thoughtMapQueue as any,
  );

  beforeEach(() => jest.resetAllMocks());

  it('merges archived and recent chat messages and carries the help level each reply was written at', async () => {
    conversationService.findConversationById.mockResolvedValue({
      currentScaffoldLevel: 0,
      hasArchivedMessages: true,
      recentMessages: [
        { content: 'q2', role: 'user', timestamp: t(10) },
        {
          content: 'a2',
          metadata: { provider: 'codex', scaffoldLevel: 2 },
          role: 'assistant',
          timestamp: t(12),
        },
      ],
      technique: 'elenchus',
      title: 'Retry bug',
    });
    messageService.getAllArchivedMessages.mockResolvedValue([
      { content: 'q1', role: 'user', timestamp: t(0) },
      { content: 'a1', role: 'assistant', timestamp: t(2) },
    ]);

    const model = await service.buildModel(
      { conversationId: new Types.ObjectId().toString(), surface: 'chat' },
      USER,
    );

    expect(model.messages.map((m) => m.content)).toEqual([
      'q1',
      'a1',
      'q2',
      'a2',
    ]);
    // The conversation is at level 0 now; the reply was written at 2.
    expect(model.messages[3].reply).toMatchObject({
      helpLevel: 2,
      provider: 'codex',
    });
    expect(model.configuration).toMatchObject({
      dialogueTitle: 'Retry bug',
      surface: 'chat',
      technique: 'elenchus',
    });
    expect(model.exportId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('skips the archive lookup when nothing has been archived', async () => {
    conversationService.findConversationById.mockResolvedValue({
      hasArchivedMessages: false,
      recentMessages: [],
      technique: 'elenchus',
      title: 't',
    });

    await service.buildModel(
      { conversationId: new Types.ObjectId().toString(), surface: 'chat' },
      USER,
    );

    expect(messageService.getAllArchivedMessages).not.toHaveBeenCalled();
  });

  it('exports the arm and prompt hash stamped on the conversation', async () => {
    const studyArm = {
      name: 'baseline-socratic',
      promptSha256: 'a'.repeat(64),
    };
    conversationService.findConversationById.mockResolvedValue({
      hasArchivedMessages: false,
      recentMessages: [],
      studyArm,
      technique: 'elenchus',
      title: 'Pilot',
    });
    const model = await service.buildModel(
      { conversationId: new Types.ObjectId().toString(), surface: 'chat' },
      USER,
    );
    expect(model.configuration.studyArm).toEqual(studyArm);
    expect(model.configuration.technique).toBeNull();
  });

  it('exports a canvas node dialogue with its technique and the stored token total', async () => {
    const dialogueId = new Types.ObjectId();
    dialogueService.validateSessionOwnership.mockResolvedValue({
      problemStructure: { roots: [], seed: 'Why is churn up?', soil: [] },
    });
    dialogueService.getDialogue.mockResolvedValue({
      _id: dialogueId,
      nodeLabel: 'Why is churn up?',
      nodeType: 'seed',
    });
    dialogueService.getAllMessages.mockResolvedValue([
      { content: 'hi', createdAt: t(0), role: 'user' },
      {
        content: 'What changed?',
        createdAt: t(3),
        metadata: { model: 'sonnet', tokens: 42 },
        role: 'assistant',
      },
    ]);

    const model = await service.buildModel(
      {
        nodeId: 'seed',
        sessionId: new Types.ObjectId().toString(),
        surface: 'canvas_node',
      },
      USER,
    );

    expect(dialogueService.getAllMessages).toHaveBeenCalledWith(dialogueId);
    expect(model.configuration).toMatchObject({
      nodeLabel: 'Why is churn up?',
      nodeType: 'seed',
      surface: 'canvas_node',
      technique: 'maieutics',
    });
    expect(model.messages[1].reply!.totalTokens).toBe(42);
    expect(model.summary.timeToFirstReplyMs).toBe(3000);
  });

  it('exports a thought-map node dialogue under the map title', async () => {
    thoughtMapService.findMapById.mockResolvedValue({ title: 'Pricing' });
    thoughtMapQueue.findMapDialogue.mockResolvedValue({
      _id: new Types.ObjectId(),
      nodeLabel: 'Annual plan',
      nodeType: 'thought',
    });
    dialogueService.getAllMessages.mockResolvedValue([]);

    const model = await service.buildModel(
      {
        mapId: new Types.ObjectId().toString(),
        nodeId: 'thought-1',
        surface: 'thought_map_node',
      },
      USER,
    );

    expect(model.configuration).toMatchObject({
      dialogueTitle: 'Pricing',
      surface: 'thought_map_node',
      technique: null,
    });
  });

  it("passes another user's conversation through as forbidden", async () => {
    conversationService.findConversationById.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      service.buildModel(
        { conversationId: new Types.ObjectId().toString(), surface: 'chat' },
        USER,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('is not found for a node that has never been talked to', async () => {
    dialogueService.validateSessionOwnership.mockResolvedValue({});
    dialogueService.getDialogue.mockResolvedValue(null);

    await expect(
      service.buildModel(
        {
          nodeId: 'soil-0',
          sessionId: new Types.ObjectId().toString(),
          surface: 'canvas_node',
        },
        USER,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('applies metrics-only mode', async () => {
    conversationService.findConversationById.mockResolvedValue({
      hasArchivedMessages: false,
      recentMessages: [{ content: 'secret', role: 'user', timestamp: t(0) }],
      technique: 'elenchus',
      title: 'Private title',
    });

    const model = await service.buildModel(
      { conversationId: new Types.ObjectId().toString(), surface: 'chat' },
      USER,
      { mode: 'metrics', redact: [] },
    );

    expect(JSON.stringify(model)).not.toMatch(/secret|Private title/);
  });
});
