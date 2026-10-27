/**
 * The AI CLI section of local-mode Settings.
 *
 * @remarks
 * Drives the real store with the API mocked, so what is checked is what the
 * user sees: every CLI with its state, no way to pick one that cannot run, a
 * confirmation before anything changes, and the API's own explanation when a
 * switch is refused.
 */
jest.mock('@/lib/api/ai', () => ({
  aiApi: {
    getModels: jest.fn(),
    getProviders: jest.fn(),
    getSettings: jest.fn(),
    switchProvider: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() },
}));

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import type { LocalProvider, LocalProvidersStatus } from '@/lib/api/ai';

import { aiApi } from '@/lib/api/ai';
import { useAiStore } from '@/lib/stores/ai-store';

import { LocalProviderSection } from '../local-provider-section';

const ORIGINAL = process.env.NEXT_PUBLIC_MUKTI_LOCAL;

function provider(overrides: Partial<LocalProvider> & Pick<LocalProvider, 'id' | 'label'>) {
  return {
    active: false,
    binary: overrides.id,
    disclosure: null,
    installRemediation: `Install ${overrides.label}.`,
    readiness: 'ready' as const,
    signInRemediation: `Run \`${overrides.id} login\` and try again.`,
    tradeOff: 'about 10 seconds per reply',
    version: '1.0.0',
    ...overrides,
  };
}

async function renderLoaded(value: LocalProvidersStatus = status()) {
  (aiApi.getProviders as jest.Mock).mockResolvedValue(value);
  render(<LocalProviderSection />);
  await screen.findByTestId('provider-row-claude');
}

function resetStore() {
  useAiStore.setState({
    activeModel: 'sonnet',
    models: [{ id: 'sonnet', label: 'Claude Sonnet' }],
    providersError: null,
    providersLoading: false,
    providerStatus: null,
    switchingTo: null,
  });
}

function status(overrides: Partial<LocalProvidersStatus> = {}): LocalProvidersStatus {
  return {
    activeId: 'claude',
    activeModel: 'sonnet',
    checkedAt: new Date().toISOString(),
    launchSource: 'saved',
    providers: [
      provider({ active: true, id: 'claude', label: 'Claude CLI' }),
      provider({
        disclosure:
          'Your global ~/.codex/AGENTS.md does apply:\nCodex offers no way to leave it out.',
        id: 'codex',
        label: 'Codex CLI',
      }),
      provider({
        id: 'agy',
        installRemediation: 'Install the Antigravity CLI (`agy`).',
        label: 'Antigravity CLI',
        readiness: 'missing',
        version: null,
      }),
    ],
    saveDefault: { available: true, savedId: 'claude' },
    ...overrides,
  };
}

const useButton = (label: string) => screen.getByRole('button', { name: `Switch to ${label}` });

describe('LocalProviderSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_MUKTI_LOCAL = '1';
    resetStore();
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
    } else {
      process.env.NEXT_PUBLIC_MUKTI_LOCAL = ORIGINAL;
    }
  });

  it('lists every CLI with its state, version and trade-off, marking the active one', async () => {
    await renderLoaded();

    const claude = screen.getByTestId('provider-row-claude');
    expect(within(claude).getByText('Active')).toBeInTheDocument();
    expect(within(claude).getByText('Default')).toBeInTheDocument();
    expect(within(claude).getByText(/Ready · 1\.0\.0/)).toBeInTheDocument();
    expect(within(claude).queryByRole('button')).not.toBeInTheDocument();

    const agy = screen.getByTestId('provider-row-agy');
    expect(within(agy).getByText('Not installed')).toBeInTheDocument();
    expect(within(agy).getByText('Install the Antigravity CLI (`agy`).')).toBeInTheDocument();
  });

  it('shows a signed-out CLI with its sign-in step and does not let it be chosen', async () => {
    const value = status();
    value.providers[1] = { ...value.providers[1], readiness: 'signed-out' };
    await renderLoaded(value);

    const codex = screen.getByTestId('provider-row-codex');
    expect(within(codex).getByText(/Signed out/)).toBeInTheDocument();
    expect(within(codex).getByText('Run `codex login` and try again.')).toBeInTheDocument();
    expect(useButton('Codex CLI')).toBeDisabled();
    expect(useButton('Antigravity CLI')).toBeDisabled();
  });

  it('asks before switching, showing the disclosure and nothing switched yet', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(useButton('Codex CLI'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Switch to Codex CLI?')).toBeInTheDocument();
    expect(screen.getByTestId('provider-disclosure')).toHaveTextContent(
      'Your global ~/.codex/AGENTS.md does apply: Codex offers no way to leave it out.'
    );
    expect(aiApi.switchProvider).not.toHaveBeenCalled();
  });

  it('switches on confirm, saving as default by default, and refreshes the models', async () => {
    (aiApi.switchProvider as jest.Mock).mockResolvedValue({
      activeId: 'codex',
      activeModel: 'gpt-6.1-sol',
      changed: true,
      models: [{ id: 'gpt-6.1-sol', label: 'GPT-6.1-Sol' }],
      saved: true,
    });
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(useButton('Codex CLI'));
    await user.click(await screen.findByRole('button', { name: 'Switch to Codex CLI' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(aiApi.switchProvider).toHaveBeenCalledWith({ id: 'codex', saveAsDefault: true });
    expect(toast.success).toHaveBeenCalledWith('Now using Codex CLI', {
      description: 'Saved as your default for future launches.',
    });
    expect(
      within(screen.getByTestId('provider-row-codex')).getByText('Active')
    ).toBeInTheDocument();
    expect(useAiStore.getState().models.map((m) => m.id)).toEqual(['gpt-6.1-sol']);
    expect(useAiStore.getState().activeModel).toBe('gpt-6.1-sol');
  });

  it('switches for this session only when the default box is cleared', async () => {
    (aiApi.switchProvider as jest.Mock).mockResolvedValue({
      activeId: 'codex',
      activeModel: 'gpt-6.1-sol',
      changed: true,
      models: [],
      saved: false,
    });
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(useButton('Codex CLI'));
    await user.click(await screen.findByRole('checkbox', { name: /default for future launches/ }));
    await user.click(screen.getByRole('button', { name: 'Switch to Codex CLI' }));

    await waitFor(() =>
      expect(aiApi.switchProvider).toHaveBeenCalledWith({ id: 'codex', saveAsDefault: false })
    );
  });

  it('explains that a named provider overrides the default, when this launch named one', async () => {
    const user = userEvent.setup();
    await renderLoaded(status({ launchSource: 'option' }));

    await user.click(useButton('Codex CLI'));

    expect(await screen.findByTestId('precedence-note')).toHaveTextContent('--provider');
  });

  it('does not show the precedence note when the launch used the saved default', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(useButton('Codex CLI'));

    await screen.findByRole('dialog');
    expect(screen.queryByTestId('precedence-note')).not.toBeInTheDocument();
  });

  it('disables saving, with the reason, when the API cannot save', async () => {
    const user = userEvent.setup();
    await renderLoaded(
      status({
        saveDefault: { available: false, reason: 'Mukti was not started by its launcher.' },
      })
    );

    await user.click(useButton('Codex CLI'));

    expect(
      await screen.findByRole('checkbox', { name: /default for future launches/ })
    ).toBeDisabled();
    expect(screen.getByText('Mukti was not started by its launcher.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Codex CLI' })).toBeEnabled();
  });

  it('keeps the dialog open with the API’s reason when the switch is refused', async () => {
    (aiApi.switchProvider as jest.Mock).mockRejectedValue(
      new Error('The `codex` CLI is not signed in. Run `codex login` and try again.')
    );
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(useButton('Codex CLI'));
    await user.click(await screen.findByRole('button', { name: 'Switch to Codex CLI' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('codex login');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('provider-row-claude')).getByText('Active')
    ).toBeInTheDocument();
  });

  it('blocks every other choice while a switch is running', async () => {
    let finish!: (value: unknown) => void;
    (aiApi.switchProvider as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const user = userEvent.setup();
    const value = status();
    value.providers[2] = { ...value.providers[2], readiness: 'ready', version: '1.1.22' };
    await renderLoaded(value);

    await user.click(useButton('Antigravity CLI'));
    await user.click(await screen.findByRole('button', { name: 'Switch to Antigravity CLI' }));

    expect(await screen.findByText(/Checking Antigravity CLI/)).toBeInTheDocument();
    expect(screen.getByText(/10 to 15 seconds/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // The modal hides the page from the accessibility tree; reach behind it.
    expect(screen.getByRole('button', { hidden: true, name: /Re-check/ })).toBeDisabled();
    expect(
      screen.getByRole('button', { hidden: true, name: 'Switch to Codex CLI' })
    ).toBeDisabled();

    finish({ activeId: 'agy', activeModel: 'g', changed: true, models: [], saved: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('re-checks on demand', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.click(screen.getByRole('button', { name: /Re-check/ }));

    await waitFor(() => expect(aiApi.getProviders).toHaveBeenLastCalledWith(true));
  });

  it('says so when the CLIs cannot be checked at all', async () => {
    (aiApi.getProviders as jest.Mock).mockRejectedValue(new Error('API unreachable'));

    render(<LocalProviderSection />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API unreachable');
  });
});
