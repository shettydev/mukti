import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThoughtMapDialoguePanel } from '@/components/thought-map/ThoughtMapDialoguePanel';
import { useDataDisclosureStore } from '@/lib/stores/data-disclosure-store';

const mockStart = jest.fn();
jest.mock('@/lib/config', () => ({ isLocalMode: () => true }));
jest.mock('@/lib/stores/ai-store', () => ({ useAiStore: () => 'sonnet' }));
jest.mock('@/lib/hooks/use-thought-map-dialogue', () => ({
  useSendThoughtMapMessage: () => ({ isPending: false, mutate: jest.fn() }),
  useStartThoughtMapDialogue: () => ({ isPending: false, mutate: mockStart }),
  useThoughtMapDialogueStream: () => ({ error: null, isProcessing: false }),
  useThoughtMapNodeMessages: () => ({ data: { pages: [{ dialogue: null, messages: [] }] }, isLoading: false }),
  useUpdateThoughtMapDialogue: () => ({ mutateAsync: jest.fn() }),
}));

it('gates the generated thought-map opening question and remembers continuation', async () => {
  localStorage.clear();
  useDataDisclosureStore.getState().close();
  render(<ThoughtMapDialoguePanel mapId="map-1" node={{ label: 'Retry handler', nodeId: 'topic-0', type: 'topic' } as never} onClose={jest.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Start Dialogue' }));
  expect(mockStart).not.toHaveBeenCalled();
  expect(useDataDisclosureStore.getState().isOpen).toBe(true);
  act(() => useDataDisclosureStore.getState().continue());
  await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole('button', { name: 'Start Dialogue' }));
  await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(2));
  expect(useDataDisclosureStore.getState().isOpen).toBe(false);
});
