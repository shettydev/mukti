import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type HelpLevel, turnBudgetView } from '@/lib/help-controls';

import { HelpControls, type HelpControlsProps } from '../help-controls';
import { ReplyKindTag } from '../reply-kind-tag';

/**
 * The learner-facing help controls (dialogue-help-controls): the level
 * indicator, More help and Explain as next-send toggles, Wrap up, and the
 * turn budget chip.
 */
describe('HelpControls', () => {
  const renderControls = (props: Partial<HelpControlsProps> = {}) => {
    const handlers = {
      onBudgetChange: jest.fn().mockResolvedValue(undefined),
      onPendingControlChange: jest.fn(),
      onWrapUp: jest.fn(),
    };
    const view = render(
      <HelpControls
        budget={null}
        canWrapUp
        level={0}
        pendingControl={null}
        {...handlers}
        {...props}
      />
    );
    return { ...handlers, ...view };
  };

  describe('help-level indicator', () => {
    it.each([
      [0, 'Questions only'],
      [1, 'Thinking prompts'],
      [2, 'Hints'],
      [3, 'Examples'],
      [4, 'Brief explanations'],
    ] as [HelpLevel, string][])('shows level %i as "%s"', (level, name) => {
      renderControls({ level });

      const pill = screen.getByTestId('help-level');
      expect(pill).toHaveTextContent(`Help ${level}`);
      expect(pill).toHaveTextContent(name);
      expect(pill).toHaveAttribute('data-level', String(level));
    });

    it('describes what the level means for screen readers', () => {
      renderControls({ level: 2 });

      expect(screen.getByTestId('help-level')).toHaveTextContent(
        /break the problem into smaller pieces/
      );
    });

    it('announces a level change politely', () => {
      const { rerender } = renderControls({ level: 1 });
      rerender(
        <HelpControls
          budget={null}
          canWrapUp
          level={2}
          onPendingControlChange={jest.fn()}
          onWrapUp={jest.fn()}
          pendingControl={null}
        />
      );

      const pill = screen.getByTestId('help-level');
      expect(pill).toHaveAttribute('aria-live', 'polite');
      expect(pill).toHaveTextContent('Hints');
    });
  });

  describe('More help and Explain', () => {
    it('selects More help for the next message', async () => {
      const { onPendingControlChange } = renderControls();

      await userEvent.click(screen.getByRole('button', { name: /more help/i }));

      expect(onPendingControlChange).toHaveBeenCalledWith('more_help');
    });

    it('shows the selected control as pressed, with a hint, and unselects it on a second click', async () => {
      const { onPendingControlChange } = renderControls({ pendingControl: 'explain' });

      const explain = screen.getByRole('button', { name: /explain/i });
      expect(explain).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /more help/i })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
      expect(screen.getByRole('status')).toHaveTextContent(/won't write the solution/);

      await userEvent.click(explain);
      expect(onPendingControlChange).toHaveBeenCalledWith(null);
    });

    it('replaces one control with the other, since a message carries at most one', async () => {
      const { onPendingControlChange } = renderControls({ pendingControl: 'more_help' });

      await userEvent.click(screen.getByRole('button', { name: /explain/i }));

      expect(onPendingControlChange).toHaveBeenCalledWith('explain');
    });

    it('indicates that the maximum level is already active at level 4', async () => {
      const { onPendingControlChange } = renderControls({ level: 4 });

      const moreHelp = screen.getByRole('button', { name: /max help/i });
      expect(moreHelp).toBeDisabled();
      expect(moreHelp).toHaveAccessibleDescription('Maximum help level already active');
      await userEvent.click(moreHelp);
      expect(onPendingControlChange).not.toHaveBeenCalled();
      // Explain is still there for the one missing piece
      expect(screen.getByRole('button', { name: /explain/i })).toBeEnabled();
    });

    it('disables the controls while a message is being answered', () => {
      renderControls({ disabled: true });

      expect(screen.getByRole('button', { name: /more help/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /explain/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /wrap up/i })).toBeDisabled();
    });
  });

  describe('Wrap up', () => {
    it('is hidden until the dialogue has an assistant reply', () => {
      renderControls({ canWrapUp: false });

      expect(screen.queryByRole('button', { name: /wrap up/i })).not.toBeInTheDocument();
    });

    it('sends straight away once there is a reply', async () => {
      const { onWrapUp } = renderControls({ canWrapUp: true });

      await userEvent.click(screen.getByRole('button', { name: /wrap up/i }));

      expect(onWrapUp).toHaveBeenCalledTimes(1);
    });
  });

  describe('turn budget', () => {
    it.each([
      [turnBudgetView(10, 3), '3/10 turns · 7 left', 'open'],
      [turnBudgetView(10, 9), '9/10 turns · next wraps up', 'open'],
      [turnBudgetView(5, 5), '5/5 turns · used', 'used'],
      [turnBudgetView(5, 7), '7/5 turns · exceeded', 'exceeded'],
    ])('shows %o as "%s"', (budget, label, state) => {
      renderControls({ budget });

      const chip = screen.getByTestId('turn-budget');
      expect(chip).toHaveTextContent(label);
      expect(chip).toHaveAttribute('data-budget-state', state);
    });

    it('sets a budget from a preset', async () => {
      const { onBudgetChange } = renderControls();

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      await userEvent.click(screen.getByRole('radio', { name: '10' }));
      expect(screen.getByLabelText('Turn limit (exchanges)')).toHaveValue('10');
      await userEvent.click(screen.getByRole('button', { name: 'Set limit' }));

      await waitFor(() => expect(onBudgetChange).toHaveBeenCalledWith(10));
    });

    it('fine-tunes with the stepper and types a custom value', async () => {
      const { onBudgetChange } = renderControls();

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      await userEvent.click(screen.getByRole('radio', { name: '5' }));
      await userEvent.click(screen.getByRole('button', { name: 'More exchanges' }));
      await userEvent.click(screen.getByRole('button', { name: 'More exchanges' }));
      expect(screen.getByLabelText('Turn limit (exchanges)')).toHaveValue('7');

      const field = screen.getByLabelText('Turn limit (exchanges)');
      await userEvent.clear(field);
      await userEvent.type(field, '4');
      await userEvent.click(screen.getByRole('button', { name: 'Set limit' }));

      await waitFor(() => expect(onBudgetChange).toHaveBeenCalledWith(4));
    });

    it('stops the stepper at 1 and 50', async () => {
      renderControls();

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      const field = screen.getByLabelText('Turn limit (exchanges)');
      await userEvent.type(field, '1');
      expect(screen.getByRole('button', { name: 'Fewer exchanges' })).toBeDisabled();
      await userEvent.clear(field);
      await userEvent.type(field, '50');
      expect(screen.getByRole('button', { name: 'More exchanges' })).toBeDisabled();
    });

    it('says where a new limit lands in a dialogue already under way', async () => {
      renderControls({ exchanges: 3 });

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      await userEvent.click(screen.getByRole('radio', { name: '5' }));

      expect(screen.getByRole('status')).toHaveTextContent(
        '3 used so far. Mukti wraps up on exchange 5, 2 from now.'
      );
      const marks = screen.getByTestId('exchange-track').children;
      expect(marks).toHaveLength(5);
      expect(marks[2]).toHaveAttribute('data-state', 'used');
      expect(marks[4]).toHaveAttribute('data-state', 'wrap-up');
    });

    it.each(['0', '51'])('rejects %s without saving', async (value) => {
      const { onBudgetChange } = renderControls();

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      await userEvent.type(screen.getByLabelText('Turn limit (exchanges)'), value);
      await userEvent.click(screen.getByRole('button', { name: 'Set limit' }));

      expect(screen.getByRole('alert')).toHaveTextContent('Choose from 1 to 50 exchanges.');
      expect(onBudgetChange).not.toHaveBeenCalled();
    });

    it('keeps only digits as the learner types', async () => {
      renderControls();

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      await userEvent.type(screen.getByLabelText('Turn limit (exchanges)'), '2.5');

      expect(screen.getByLabelText('Turn limit (exchanges)')).toHaveValue('25');
    });

    it('starts from the current budget and removes it with Off', async () => {
      const { onBudgetChange } = renderControls({ budget: turnBudgetView(8, 2) });

      await userEvent.click(screen.getByTestId('turn-budget'));
      expect(screen.getByLabelText('Turn limit (exchanges)')).toHaveValue('8');
      expect(screen.getByRole('button', { name: 'Set limit' })).toBeDisabled();
      await userEvent.click(screen.getByRole('radio', { name: 'Off' }));
      await userEvent.click(screen.getByRole('button', { name: 'Remove limit' }));

      await waitFor(() => expect(onBudgetChange).toHaveBeenCalledWith(null));
    });

    it('keeps the form open with an error when saving fails', async () => {
      const { onBudgetChange } = renderControls();
      onBudgetChange.mockRejectedValueOnce(new Error('offline'));

      await userEvent.click(screen.getByRole('button', { name: 'Set a turn limit' }));
      await userEvent.click(screen.getByRole('radio', { name: '5' }));
      await userEvent.click(screen.getByRole('button', { name: 'Set limit' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i);
    });

    it('is read-only without a change handler, and hidden when there is no budget', () => {
      const { rerender } = render(
        <HelpControls
          budget={turnBudgetView(5, 1)}
          canWrapUp
          level={0}
          onPendingControlChange={jest.fn()}
          onWrapUp={jest.fn()}
          pendingControl={null}
        />
      );
      expect(screen.getByTestId('turn-budget').tagName).toBe('SPAN');

      rerender(
        <HelpControls
          budget={null}
          canWrapUp
          level={0}
          onPendingControlChange={jest.fn()}
          onWrapUp={jest.fn()}
          pendingControl={null}
        />
      );
      expect(screen.queryByTestId('turn-budget')).not.toBeInTheDocument();
    });
  });
});

describe('ReplyKindTag', () => {
  it.each([
    ['explain', 'Explanation'],
    ['wrap_up', 'Summary'],
  ] as const)('tags a %s reply as "%s"', (turnKind, label) => {
    render(<ReplyKindTag turnKind={turnKind} />);

    expect(screen.getByText(label)).toHaveAttribute('data-turn-kind', turnKind);
  });

  it.each(['ordinary', 'more_help', undefined] as const)(
    'adds no tag to a %s reply',
    (turnKind) => {
      const { container } = render(<ReplyKindTag turnKind={turnKind} />);

      expect(container).toBeEmptyDOMElement();
    }
  );
});
