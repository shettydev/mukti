import { model, Types } from 'mongoose';

import { ConversationSchema } from '../conversation.schema';
import { NodeDialogueSchema } from '../node-dialogue.schema';

/**
 * The help-control fields are optional with defaults, so documents written
 * before them load unchanged and need no migration (design: Migration Plan).
 * Runs offline: `hydrate` builds a document as if it came from MongoDB.
 */
describe('help-control schema fields', () => {
  const Conversation = model('HelpControlsConversation', ConversationSchema);
  const NodeDialogue = model('HelpControlsNodeDialogue', NodeDialogueSchema);

  const oldConversation = {
    _id: new Types.ObjectId(),
    currentScaffoldLevel: 2,
    metadata: { estimatedCost: 0, messageCount: 6, totalTokens: 90 },
    recentMessages: [
      { content: 'Why?', role: 'assistant', timestamp: new Date() },
    ],
    technique: 'elenchus',
    title: 'Before help controls',
    totalMessageCount: 6,
    userId: new Types.ObjectId(),
  };

  const oldNodeDialogue = {
    _id: new Types.ObjectId(),
    currentScaffoldLevel: 1,
    messageCount: 3,
    nodeId: 'root-0',
    nodeLabel: 'We need to hire more people',
    nodeType: 'root',
    sessionId: new Types.ObjectId(),
  };

  describe('documents stored before help controls', () => {
    it('load a conversation with no budget and its state unchanged', () => {
      const doc = Conversation.hydrate(oldConversation);

      expect(doc.turnBudget).toBeNull();
      expect(doc.conclusionOffered).toBe(false);
      expect(doc.currentScaffoldLevel).toBe(2);
      expect(doc.totalMessageCount).toBe(6);
      expect(doc.validateSync()).toBeUndefined();
    });

    it('load a node dialogue with no budget and its state unchanged', () => {
      const doc = NodeDialogue.hydrate(oldNodeDialogue);

      expect(doc.turnBudget).toBeNull();
      expect(doc.conclusionOffered).toBe(false);
      expect(doc.currentScaffoldLevel).toBe(1);
      expect(doc.messageCount).toBe(3);
      expect(doc.validateSync()).toBeUndefined();
    });

    it('keep replies without a turn kind readable (they are ordinary)', () => {
      const doc = Conversation.hydrate(oldConversation);

      expect(doc.recentMessages[0].metadata?.turnKind).toBeUndefined();
    });
  });

  describe('turnBudget', () => {
    it.each([1, 25, 50, null])('accepts %p', (turnBudget) => {
      expect(
        new Conversation({ ...oldConversation, turnBudget }).validateSync(),
      ).toBeUndefined();
      expect(
        new NodeDialogue({ ...oldNodeDialogue, turnBudget }).validateSync(),
      ).toBeUndefined();
    });

    it.each([0, 51])('rejects %p', (turnBudget) => {
      expect(
        new Conversation({ ...oldConversation, turnBudget }).validateSync()
          ?.errors.turnBudget,
      ).toBeDefined();
      expect(
        new NodeDialogue({ ...oldNodeDialogue, turnBudget }).validateSync()
          ?.errors.turnBudget,
      ).toBeDefined();
    });
  });
});
