jest.mock('@/lib/api/data-disclosure', () => ({
  dataDisclosureApi: { get: jest.fn(), deleteData: jest.fn() },
}));
jest.mock('@/lib/config', () => ({ isLocalMode: jest.fn(() => true) }));

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataFlowPanel } from '../data-flow-panel';
import { DataDangerZone } from '../data-danger-zone';
import { dataDisclosureApi } from '@/lib/api/data-disclosure';
import { isLocalMode } from '@/lib/config';
import {
  requestDataDisclosure,
  useDataDisclosureStore,
  DISCLOSURE_SEEN_KEY,
} from '@/lib/stores/data-disclosure-store';

const fixture = (configuration = 'local') => ({
  configuration,
  deletion: { action: 'settings#delete-data', label: 'Delete all my Mukti data' },
  model: {
    runner:
      configuration === 'local' ? 'Antigravity sends requests to vendor servers' : 'OpenRouter',
    billedTo: configuration === 'hosted-own-key' ? 'Your key is encrypted' : 'Your subscription',
    disclosure: 'Provider disclosure',
    planNote: 'Plan limits apply',
    limits:
      configuration === 'hosted-free'
        ? { kind: 'free-daily', dailyMessages: 25, resetsAt: '2026-11-10T00:00:00Z' }
        : { kind: 'own-plan' },
  },
  surfaces: [
    {
      id: 'chat',
      label: 'Chat',
      keyNote: 'Your sign-in',
      sends: ['System prompt', 'Recent messages'],
      historyWindow: 50,
    },
  ],
  notRun: [{ id: 'misconception', label: 'Misconception detection' }],
  storage: {
    items: ['Conversations'],
    location: '/custom/local-db',
    settingsLocation: '~/.mukti/config.json',
  },
  outside:
    configuration === 'local'
      ? [
          {
            what: 'Antigravity history under mukti-socratic',
            where: '~/.gemini/antigravity-cli',
            howToRemove: 'Remove using Antigravity',
          },
        ]
      : [],
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
    render(<DataFlowPanel open onOpenChange={jest.fn()} />);
    expect(
      await screen.findByText(
        configuration === 'local' ? 'Antigravity sends requests to vendor servers' : 'OpenRouter'
      )
    ).toBeVisible();
    expect(screen.getByText('System prompt')).toBeVisible();
    expect(screen.getByText('/custom/local-db')).toBeVisible();
    if (configuration === 'local')
      expect(screen.getByText('Antigravity history under mukti-socratic')).toBeVisible();
    if (configuration === 'hosted-free')
      expect(screen.getByText(/25 messages per day/)).toBeVisible();
    if (configuration === 'hosted-own-key')
      expect(screen.getByText('Your key is encrypted')).toBeVisible();
  }
);

it('refetches each opening and exposes a retry after load failure', async () => {
  (dataDisclosureApi.get as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  render(<DataFlowPanel open onOpenChange={jest.fn()} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Provider disclosure')).toBeVisible();
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
      success: false,
      failedCategories: ['thought maps'],
      results: [],
      outside: ['Antigravity history was not removed'],
    })
    .mockResolvedValueOnce({
      success: true,
      failedCategories: [],
      results: [],
      outside: ['Antigravity history was not removed'],
    });
  render(<DataDangerZone />);
  expect(screen.queryByRole('button', { name: 'Delete my account' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Delete all my Mukti data' }));
  const confirm = screen.getByRole('button', { name: 'Permanently delete data' });
  expect(confirm).toBeDisabled();
  await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await user.click(confirm);
  expect(await screen.findByText(/thought maps/)).toBeVisible();
  expect(screen.getByText('Antigravity history was not removed')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Retry deletion' }));
  await waitFor(() => expect(dataDisclosureApi.deleteData).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/All your Mukti data was deleted/)).toBeVisible();
});
