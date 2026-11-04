/**
 * The default turn limit in Settings (dialogue-help-controls, "default budget
 * from Settings"). Drives the real store with the API mocked, so the value is
 * checked from what the API returns to what the user sees, and back.
 */
jest.mock('@/lib/api/ai', () => ({
  aiApi: {
    getModels: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';

import { aiApi } from '@/lib/api/ai';
import { useAiStore } from '@/lib/stores/ai-store';

import { DefaultTurnBudgetSection } from '../default-turn-budget-section';

const field = () => screen.getByLabelText('Default turn limit (exchanges)');

async function renderWithStoredDefault(defaultTurnBudget: null | number) {
  (aiApi.getSettings as jest.Mock).mockResolvedValue({
    activeModel: 'openai/gpt-5-mini',
    defaultTurnBudget,
    hasOpenRouterKey: false,
    openRouterKeyLast4: null,
  });
  render(<DefaultTurnBudgetSection />);
  await act(async () => {
    await useAiStore.getState().hydrate();
  });
}

describe('DefaultTurnBudgetSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAiStore.setState({ defaultTurnBudget: null, isHydrated: false });
    (aiApi.getModels as jest.Mock).mockResolvedValue({ mode: 'curated', models: [] });
    (aiApi.updateSettings as jest.Mock).mockImplementation(
      (dto: { defaultTurnBudget?: null | number }) =>
        Promise.resolve({ defaultTurnBudget: dto.defaultTurnBudget })
    );
  });

  it('shows the stored default', async () => {
    await renderWithStoredDefault(10);

    expect(field()).toHaveValue(10);
    expect(screen.getByRole('status')).toHaveTextContent('limit of 10 turns');
  });

  it('shows no limit when none is stored', async () => {
    await renderWithStoredDefault(null);

    expect(field()).toHaveValue(null);
    expect(screen.getByRole('status')).toHaveTextContent('no turn limit');
  });

  it('round-trips a new default through the API', async () => {
    const user = userEvent.setup();
    await renderWithStoredDefault(10);

    await user.clear(field());
    await user.type(field(), '12');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Saved. New dialogues start with a limit of 12 turns.'
      )
    );
    expect(aiApi.updateSettings).toHaveBeenCalledWith({ defaultTurnBudget: 12 });
    expect(useAiStore.getState().defaultTurnBudget).toBe(12);
    expect(field()).toHaveValue(12);
  });

  it('clears the default', async () => {
    const user = userEvent.setup();
    await renderWithStoredDefault(10);

    await user.click(screen.getByRole('button', { name: 'No limit' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Saved. New dialogues have no turn limit.'
      )
    );
    expect(aiApi.updateSettings).toHaveBeenCalledWith({ defaultTurnBudget: null });
    expect(field()).toHaveValue(null);
  });

  it('treats an empty field as no limit', async () => {
    const user = userEvent.setup();
    await renderWithStoredDefault(10);

    await user.clear(field());
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(aiApi.updateSettings).toHaveBeenCalledWith({ defaultTurnBudget: null })
    );
  });

  it.each(['0', '51', '7.5'])('rejects %s without saving', async (value) => {
    const user = userEvent.setup();
    await renderWithStoredDefault(null);

    await user.type(field(), value);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number from 1 to 50');
    expect(aiApi.updateSettings).not.toHaveBeenCalled();
  });

  it('says so when saving fails', async () => {
    const user = userEvent.setup();
    await renderWithStoredDefault(null);
    (aiApi.updateSettings as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    await user.type(field(), '5');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    expect(useAiStore.getState().defaultTurnBudget).toBeNull();
  });
});
