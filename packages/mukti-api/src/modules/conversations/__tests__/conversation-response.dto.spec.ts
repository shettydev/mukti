import { Types } from 'mongoose';

import { ConversationResponseDto } from '../dto/conversation-response.dto';

/**
 * The help state a chat client reads on load (dialogue-help-controls: the
 * indicator and the budget chip).
 */
describe('ConversationResponseDto', () => {
  const conversation = (overrides: Record<string, unknown> = {}) =>
    ({
      _id: new Types.ObjectId(),
      metadata: { estimatedCost: 0, messageCount: 4, totalTokens: 10 },
      recentMessages: [],
      technique: 'elenchus',
      title: 'Retry handler',
      totalMessageCount: 4,
      userId: new Types.ObjectId(),
      ...overrides,
    }) as any;

  it('exposes the help level and turn budget', () => {
    const dto = ConversationResponseDto.fromDocument(
      conversation({ currentScaffoldLevel: 2, turnBudget: 5 }),
    );

    expect(dto.currentScaffoldLevel).toBe(2);
    expect(dto.turnBudget).toBe(5);
  });

  it('reports level 0 and no budget for a conversation stored before help controls', () => {
    const dto = ConversationResponseDto.fromDocument(conversation());

    expect(dto.currentScaffoldLevel).toBe(0);
    expect(dto.turnBudget).toBeNull();
  });
});
