jest.mock('@/lib/api/data-disclosure', () => ({
  dataDisclosureApi: { deleteData: jest.fn(), get: jest.fn() },
}));
jest.mock('@/lib/config', () => ({ isLocalMode: jest.fn(() => true) }));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { dataDisclosureApi } from '@/lib/api/data-disclosure';
import { isLocalMode } from '@/lib/config';
import {
  DISCLOSURE_SEEN_KEY,
  requestDataDisclosure,
  useDataDisclosureStore,
} from '@/lib/stores/data-disclosure-store';

import { DataDangerZone } from '../data-danger-zone';
import { DataFlowPanel } from '../data-flow-panel';

const fixture = (configuration = 'local') => ({
  configuration,
  deletion: { action: 'settings#delete-data', label: 'Delete all my Mukti data' },
  model: {
    billedTo: configuration === 'hosted-own-key' ? 'Your key is encrypted' : 'Your subscription',
    disclosure: 'Provider disclosure',
    limits:
      configuration === 'hosted-free'
        ? { dailyMessages: 25, kind: 'free-daily', resetsAt: '2026-11-10T00:00:00Z' }
        : { kind: 'own-plan' },
    planNote: 'Plan limits apply',
    runner:
      configuration === 'local' ? 'Antigravity sends requests to vendor servers' : 'OpenRouter',
  },
  notRun: [{ id: 'misconception', label: 'Misconception detection' }],
  outside:
    configuration === 'local'
      ? [
          {
            howToRemove: 'Remove using Antigravity',
            what: 'Antigravity history under mukti-socratic',
            where: '~/.gemini/antigravity-cli',
          },
        ]
      : [],
  storage: {
    items: ['Conversations'],
    location: '/custom/local-db',
    settingsLocation: '~/.mukti/config.json',
  },
  surfaces: [
    {
      historyWindow: 50,
      id: 'chat',
      keyNote: 'Your sign-in',
      label: 'Chat',
      sends: ['System prompt', 'Recent messages'],
    },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useDataDisclosureStore.setState({ isOpen: false });
  (isLocalMode as jest.Mock).mockReturnValue(true);
  (dataDisclosureApi.get as jest.Mock).mockResolvedValue(fixture());
});

it.each(['local', 'hosted-free', 'hosted-own-key'])(
  'renders endpoint facts for %s',
  async (configuration) => {
    (dataDisclosureApi.get as jest.Mock).mockResolvedValue(fixture(configuration));
    render(<DataFlowPanel onOpenChange={jest.fn()} open />);
    expect(
      await screen.findByText(
        configuration === 'local' ? 'Antigravity sends requests to vendor servers' : 'OpenRouter'
      )
    ).toBeVisible();
    expect(screen.getByText('System prompt')).toBeVisible();
    expect(screen.getByText('/custom/local-db')).toBeVisible();
    if (configuration === 'local') {
      expect(screen.getByText('Antigravity history under mukti-socratic')).toBeVisible();
    }
    if (configuration === 'hosted-free') {
      expect(screen.getByText(/25 messages per day/)).toBeVisible();
    }
    if (configuration === 'hosted-own-key') {
      expect(screen.getByText('Your key is encrypted')).toBeVisible();
    }
  }
);

it('refetches each opening and exposes a retry after load failure', async () => {
  (dataDisclosureApi.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  render(<DataFlowPanel onOpenChange={jest.fn()} open />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Provider disclosure')).toBeVisible();
});

it('preserves misconception turns without relabelling them as messages', async () => {
  const data = fixture('hosted-own-key');
  data.surfaces = [
    {
      historyWindow: 3,
      id: 'misconception',
      keyNote: 'Mukti platform key',
      label: 'Misconception detection',
      sends: ['The last 3 turns of the dialogue'],
    },
  ];
  (dataDisclosureApi.get as jest.Mock).mockResolvedValue(data);
  render(<DataFlowPanel onOpenChange={jest.fn()} open />);
  expect(await screen.findByText('The last 3 turns of the dialogue')).toBeVisible();
  expect(screen.queryByText(/up to 3 messages/)).not.toBeInTheDocument();
});

it('refetches the active provider when reopened', async () => {
  const { rerender } = render(<DataFlowPanel onOpenChange={jest.fn()} open />);
  expect(await screen.findByText('Antigravity sends requests to vendor servers')).toBeVisible();
  rerender(<DataFlowPanel onOpenChange={jest.fn()} open={false} />);
  const next = fixture();
  next.model.runner = 'Codex sends requests to vendor servers';
  next.outside = [];
  (dataDisclosureApi.get as jest.Mock).mockResolvedValue(next);
  rerender(<DataFlowPanel onOpenChange={jest.fn()} open />);
  expect(await screen.findByText('Codex sends requests to vendor servers')).toBeVisible();
  expect(screen.queryByText('Antigravity history under mukti-socratic')).not.toBeInTheDocument();
  expect(dataDisclosureApi.get).toHaveBeenCalledTimes(2);
});

it('gates the first local send, continues once and remembers subsequent sends', async () => {
  let pending!: Promise<boolean>;
  act(() => {
    pending = requestDataDisclosure();
  });
  expect(useDataDisclosureStore.getState().isOpen).toBe(true);
  act(() => useDataDisclosureStore.getState().continue());
  await expect(pending).resolves.toBe(true);
  expect(localStorage.getItem(DISCLOSURE_SEEN_KEY)).toBe('1');
  await expect(requestDataDisclosure()).resolves.toBe(true);
});

it('does not send on dismissal or queue a second pending send', async () => {
  const first = requestDataDisclosure();
  await expect(requestDataDisclosure()).resolves.toBe(false);
  useDataDisclosureStore.getState().close();
  await expect(first).resolves.toBe(false);
  expect(localStorage.getItem(DISCLOSURE_SEEN_KEY)).toBeNull();
});

it('does not gate hosted messages', async () => {
  (isLocalMode as jest.Mock).mockReturnValue(false);
  await expect(requestDataDisclosure()).resolves.toBe(true);
  expect(useDataDisclosureStore.getState().isOpen).toBe(false);
});

it('requires typed confirmation, reports partial failures and retries with outside data intact', async () => {
  const user = userEvent.setup();
  (dataDisclosureApi.deleteData as jest.Mock)
    .mockResolvedValueOnce({
      failedCategories: ['thought maps'],
      outside: ['Antigravity history was not removed'],
      results: [],
      success: false,
    })
    .mockResolvedValueOnce({
      failedCategories: [],
      outside: ['Antigravity history was not removed'],
      results: [],
      success: true,
    });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DataDangerZone />
    </QueryClientProvider>
  );
  expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete all my Mukti data' }));
  const confirm = screen.getByRole('button', { name: 'Permanently delete data' });
  expect(confirm).toBeDisabled();
  await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await user.click(confirm);
  expect(await screen.findByText(/Some data could not be deleted: thought maps/)).toBeVisible();
  expect(screen.getByText('Antigravity history was not removed')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Retry deletion' }));
  await waitFor(() => expect(dataDisclosureApi.deleteData).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/All your Mukti data was deleted/)).toBeVisible();
});
