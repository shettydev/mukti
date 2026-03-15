import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThoughtMapList } from '../thought-map-list';

const mockPush = jest.fn();
const mockUseThoughtMaps = jest.fn();
const mockUsePathname = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/hooks/use-thought-map', () => ({
  useThoughtMaps: () => mockUseThoughtMaps(),
}));

describe('ThoughtMapList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/maps/map-2');
  });

  it('renders a loading state', () => {
    mockUseThoughtMaps.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });

    const { container } = render(<ThoughtMapList />);
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('renders an empty state when there are no maps', () => {
    mockUseThoughtMaps.mockReturnValue({
      data: [],
      error: null,
      isLoading: false,
    });

    render(<ThoughtMapList />);
    expect(screen.getByText('No thought maps yet')).toBeInTheDocument();
  });

  it('highlights the active map', () => {
    mockUseThoughtMaps.mockReturnValue({
      data: [
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'map-1',
          nodeCount: 3,
          rootNodeId: 'topic-0',
          settings: {
            autoSuggestEnabled: true,
            autoSuggestIdleSeconds: 10,
            maxSuggestionsPerNode: 4,
          },
          status: 'active',
          title: 'First map',
          updatedAt: '2026-01-01T00:00:00.000Z',
          userId: 'user-1',
        },
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'map-2',
          nodeCount: 5,
          rootNodeId: 'topic-0',
          settings: {
            autoSuggestEnabled: true,
            autoSuggestIdleSeconds: 10,
            maxSuggestionsPerNode: 4,
          },
          status: 'active',
          title: 'Active map',
          updatedAt: '2026-01-01T00:00:00.000Z',
          userId: 'user-1',
        },
      ],
      error: null,
      isLoading: false,
    });

    render(<ThoughtMapList />);

    expect(screen.getByRole('button', { name: /active map/i })).toHaveClass('bg-japandi-sage/20');
  });

  it('navigates to a map detail page when clicked', async () => {
    const user = userEvent.setup();
    const onThoughtMapClick = jest.fn();

    mockUseThoughtMaps.mockReturnValue({
      data: [
        {
          createdAt: '2026-01-01T00:00:00.000Z',
          id: 'map-1',
          nodeCount: 3,
          rootNodeId: 'topic-0',
          settings: {
            autoSuggestEnabled: true,
            autoSuggestIdleSeconds: 10,
            maxSuggestionsPerNode: 4,
          },
          status: 'active',
          title: 'Clickable map',
          updatedAt: '2026-01-01T00:00:00.000Z',
          userId: 'user-1',
        },
      ],
      error: null,
      isLoading: false,
    });

    render(<ThoughtMapList onThoughtMapClick={onThoughtMapClick} />);

    await user.click(screen.getByRole('button', { name: /clickable map/i }));

    expect(mockPush).toHaveBeenCalledWith('/maps/map-1');
    expect(onThoughtMapClick).toHaveBeenCalledWith('map-1');
  });
});
