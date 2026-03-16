import { NodeDialogueSchema } from '../node-dialogue.schema';

describe('NodeDialogueSchema indexes', () => {
  it('applies the canvas uniqueness constraint only when sessionId is an ObjectId', () => {
    const indexes = NodeDialogueSchema.indexes();
    const sessionIndex = indexes.find(
      ([fields]) => fields.nodeId === 1 && fields.sessionId === 1,
    );

    expect(sessionIndex).toBeDefined();
    expect(sessionIndex?.[1]).toMatchObject({
      partialFilterExpression: { sessionId: { $type: 'objectId' } },
      unique: true,
    });
    expect(sessionIndex?.[1]).not.toHaveProperty('sparse', true);
  });

  it('applies the thought-map uniqueness constraint only when mapId is an ObjectId', () => {
    const indexes = NodeDialogueSchema.indexes();
    const mapIndex = indexes.find(
      ([fields]) => fields.mapId === 1 && fields.nodeId === 1,
    );

    expect(mapIndex).toBeDefined();
    expect(mapIndex?.[1]).toMatchObject({
      partialFilterExpression: { mapId: { $type: 'objectId' } },
      unique: true,
    });
    expect(mapIndex?.[1]).not.toHaveProperty('sparse', true);
  });
});
