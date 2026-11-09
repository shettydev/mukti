import { Types } from 'mongoose';

import {
  DialogueMessageResponseDto,
  NodeDialogueResponseDto,
} from '../dto/dialogue-response.dto';

/**
 * The help state a node dialogue's clients read on load
 * (dialogue-help-controls: the indicator and the budget chip).
 */
describe('Node dialogue response DTOs', () => {
  const dialogue = (overrides: Record<string, unknown> = {}) =>
    ({
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      messageCount: 5,
      nodeId: 'root-0',
      nodeLabel: 'We need to hire',
      nodeType: 'root',
      sessionId: new Types.ObjectId(),
      ...overrides,
    }) as any;

  it('exposes the help level and turn budget', () => {
    const dto = NodeDialogueResponseDto.fromDocument(
      dialogue({ currentScaffoldLevel: 3, turnBudget: 10 }),
    );

    expect(dto.currentScaffoldLevel).toBe(3);
    expect(dto.turnBudget).toBe(10);
  });

  it('reports level 0 and no budget for a dialogue stored before help controls', () => {
    const dto = NodeDialogueResponseDto.fromDocument(dialogue());

    expect(dto.currentScaffoldLevel).toBe(0);
    expect(dto.turnBudget).toBeNull();
  });

  it("passes a reply's turn kind through for tagging", () => {
    const dto = DialogueMessageResponseDto.fromDocument({
      _id: new Types.ObjectId(),
      content: '## Established\n- ...',
      createdAt: new Date(),
      dialogueId: new Types.ObjectId(),
      metadata: { model: 'sonnet', turnKind: 'wrap_up' },
      role: 'assistant',
      sequence: 4,
    } as any);

    expect(dto.metadata?.turnKind).toBe('wrap_up');
  });
});
