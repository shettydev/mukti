import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ExtractionReviewPanel } from '../ExtractionReviewPanel';

const mockPush = jest.fn();
const mockConfirmDraftMap = jest.fn();
const mockResetExtraction = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/stores/thought-map-store', () => ({
  useExtractionState: () => ({
    draftMap: {
      map: {
        createdAt: '2026-01-01T00:00:00.000Z',
        id: 'draft-map-1',
        nodeCount: 2,
        rootNodeId: 'topic-0',
        settings: {
          autoSuggestEnabled: true,
          autoSuggestIdleSeconds: 10,
          maxSuggestionsPerNode: 4,
        },
        status: 'draft',
        title: 'Draft map',
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
      nodes: [
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          depth: 0,
          fromSuggestion: false,
          id: 'node-1',
          isCollapsed: false,
          isExplored: false,
          label: 'Draft map',
          mapId: 'draft-map-1',
          messageCount: 0,
          nodeId: 'topic-0',
          parentNodeId: null,
          position: { x: 0, y: 0 },
          type: 'topic',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          depth: 1,
          fromSuggestion: false,
          id: 'node-2',
          isCollapsed: false,
          isExplored: false,
          label: 'Child',
          mapId: 'draft-map-1',
          messageCount: 0,
          nodeId: 'thought-0',
          parentNodeId: 'topic-0',
          position: { x: 0, y: 0 },
          type: 'thought',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    },
  }),
  useThoughtMapActions: () => ({
    confirmDraftMap: mockConfirmDraftMap,
    resetExtraction: mockResetExtraction,
  }),
}));

describe('ExtractionReviewPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the map detail route after confirming a draft map', async () => {
    const user = userEvent.setup();
    mockConfirmDraftMap.mockResolvedValue({
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'map-123',
      nodeCount: 2,
      rootNodeId: 'topic-0',
      settings: {
        autoSuggestEnabled: true,
        autoSuggestIdleSeconds: 10,
        maxSuggestionsPerNode: 4,
      },
      status: 'active',
      title: 'Confirmed map',
      updatedAt: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    });

    render(<ExtractionReviewPanel />);

    await user.click(screen.getByRole('button', { name: /open map/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/map/map-123');
    });
  });
});
