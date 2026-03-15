import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { ConvertCanvasDto } from '../dto/convert-canvas.dto';
import { CreateShareLinkDto } from '../dto/create-share-link.dto';
import { CreateThoughtMapDto } from '../dto/create-thought-map.dto';
import { CreateThoughtNodeDto } from '../dto/create-thought-node.dto';
import { ExtractConversationDto } from '../dto/extract-conversation.dto';
import { RequestBranchSuggestionsDto } from '../dto/request-branch-suggestions.dto';
import { UpdateThoughtMapSettingsDto } from '../dto/update-thought-map-settings.dto';
import { UpdateThoughtNodeDto } from '../dto/update-thought-node.dto';

describe('ThoughtMap DTO validation', () => {
  const validate = <T extends object>(cls: new () => T, payload: object) =>
    validateSync(plainToInstance(cls, payload));

  it('accepts a valid CreateThoughtMapDto payload', () => {
    expect(
      validate(CreateThoughtMapDto, { title: 'A valid title' }),
    ).toHaveLength(0);
  });

  it('rejects an overlong CreateThoughtMapDto title', () => {
    expect(
      validate(CreateThoughtMapDto, { title: 'x'.repeat(501) }),
    ).not.toHaveLength(0);
  });

  it('accepts a valid CreateThoughtNodeDto payload', () => {
    expect(
      validate(CreateThoughtNodeDto, {
        fromSuggestion: true,
        label: 'Explore this branch',
        parentId: 'topic-0',
        type: 'question',
      }),
    ).toHaveLength(0);
  });

  it('rejects invalid CreateThoughtNodeDto enum values', () => {
    expect(
      validate(CreateThoughtNodeDto, {
        label: 'Bad type',
        parentId: 'topic-0',
        type: 'seed',
      }),
    ).not.toHaveLength(0);
  });

  it('accepts a valid RequestBranchSuggestionsDto payload', () => {
    expect(
      validate(RequestBranchSuggestionsDto, {
        model: 'openai/gpt-5-mini',
        parentNodeId: 'topic-0',
      }),
    ).toHaveLength(0);
  });

  it('rejects an empty RequestBranchSuggestionsDto parentNodeId', () => {
    expect(
      validate(RequestBranchSuggestionsDto, {
        parentNodeId: '',
      }),
    ).not.toHaveLength(0);
  });

  it('accepts a valid ExtractConversationDto payload', () => {
    expect(
      validate(ExtractConversationDto, {
        conversationId: '507f1f77bcf86cd799439011',
        model: 'openai/gpt-5-mini',
      }),
    ).toHaveLength(0);
  });

  it('rejects a non-ObjectId ExtractConversationDto conversationId', () => {
    expect(
      validate(ExtractConversationDto, {
        conversationId: 'not-a-mongo-id',
      }),
    ).not.toHaveLength(0);
  });

  it('accepts a valid CreateShareLinkDto payload', () => {
    expect(
      validate(CreateShareLinkDto, {
        expiresAt: '2027-01-01T00:00:00.000Z',
      }),
    ).toHaveLength(0);
  });

  it('rejects an invalid CreateShareLinkDto expiresAt', () => {
    expect(
      validate(CreateShareLinkDto, { expiresAt: 'tomorrow' }),
    ).not.toHaveLength(0);
  });

  it('accepts a valid UpdateThoughtMapSettingsDto payload', () => {
    expect(
      validate(UpdateThoughtMapSettingsDto, {
        autoSuggestEnabled: false,
        autoSuggestIdleSeconds: 30,
        maxSuggestionsPerNode: 3,
      }),
    ).toHaveLength(0);
  });

  it('rejects UpdateThoughtMapSettingsDto values outside allowed ranges', () => {
    expect(
      validate(UpdateThoughtMapSettingsDto, {
        autoSuggestIdleSeconds: 1,
        maxSuggestionsPerNode: 9,
      }),
    ).not.toHaveLength(0);
  });

  it('accepts a valid UpdateThoughtNodeDto payload', () => {
    expect(
      validate(UpdateThoughtNodeDto, {
        isCollapsed: true,
        label: 'Refined thought',
        position: { x: 1, y: 2 },
      }),
    ).toHaveLength(0);
  });

  it('rejects invalid nested UpdateThoughtNodeDto coordinates', () => {
    expect(
      validate(UpdateThoughtNodeDto, {
        position: { x: 'left' },
      }),
    ).not.toHaveLength(0);
  });

  it('surfaces the current ConvertCanvasDto optional-title contract mismatch', () => {
    expect(validate(ConvertCanvasDto, {})).not.toHaveLength(0);
  });

  it('accepts a non-empty ConvertCanvasDto title when provided', () => {
    expect(
      validate(ConvertCanvasDto, { title: 'Override title' }),
    ).toHaveLength(0);
  });
});
