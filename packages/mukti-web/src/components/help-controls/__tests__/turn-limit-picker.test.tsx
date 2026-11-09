import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { parseTurnLimit, turnLimitConsequence, TurnLimitPicker } from '../turn-limit-picker';

/**
 * The turn-limit picker (dialogue-help-controls, "Optional turn budget ends
 * with a summary"): presets, a stepper bounded to 1-50, digit-only typing and
 * a track that marks the exchange that wraps up.
 */
function Harness({ initial = '', used }: { initial?: string; used?: number }) {
  const [draft, setDraft] = useState(initial);
  return (
    <TurnLimitPicker
      ariaLabel="Turn limit (exchanges)"
      draft={draft}
      onDraftChange={setDraft}
      used={used}
    />
  );
}

const field = () => screen.getByLabelText('Turn limit (exchanges)');

describe('parseTurnLimit', () => {
  it.each([
    ['1', 1],
    ['50', 50],
    ['12', 12],
  ])('accepts %s', (draft, limit) => {
    expect(parseTurnLimit(draft)).toBe(limit);
  });

  it.each(['', '0', '51', '2.5', 'ten', '-3'])('rejects %p', (draft) => {
    expect(parseTurnLimit(draft)).toBeNull();
  });
});

describe('turnLimitConsequence', () => {
  it.each([
    [null, 0, 'No limit. Wrap up is there whenever you want a summary.'],
    [10, 0, 'Mukti wraps up on exchange 10. You can keep going after it.'],
    [7, 2, '2 used so far. Mukti wraps up on exchange 7, 5 from now. You can keep going after it.'],
    [3, 2, 'Your next message gets the wrap-up summary. You can keep going after it.'],
    [
      3,
      4,
      "You've already had 4 exchanges, so this limit has passed and nothing wraps up automatically.",
    ],
  ])('limit %p after %p exchanges', (limit, used, text) => {
    expect(turnLimitConsequence(limit, used)).toBe(text);
  });
});

describe('TurnLimitPicker', () => {
  it('offers Off and presets as a radio group, Off checked when empty', () => {
    render(<Harness />);

    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.closest('label')?.textContent)).toEqual(['Off', '5', '10', '20']);
    expect(screen.getByRole('radio', { name: 'Off' })).toBeChecked();
    expect(field()).toHaveValue('');
  });

  it('picks a preset', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('radio', { name: '20' }));

    expect(field()).toHaveValue('20');
    expect(screen.getByRole('radio', { name: '20' })).toBeChecked();
  });

  it('steps from 10 when nothing is set, and within 1-50', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'More exchanges' }));
    expect(field()).toHaveValue('10');

    await userEvent.clear(field());
    await userEvent.type(field(), '50');
    expect(screen.getByRole('button', { name: 'More exchanges' })).toBeDisabled();

    await userEvent.clear(field());
    await userEvent.type(field(), '1');
    expect(screen.getByRole('button', { name: 'Fewer exchanges' })).toBeDisabled();
  });

  it('steps with the arrow keys', async () => {
    render(<Harness initial="5" />);

    await userEvent.click(field());
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');

    expect(field()).toHaveValue('6');
  });

  it('keeps only digits', async () => {
    render(<Harness />);

    await userEvent.type(field(), '1a.2');

    expect(field()).toHaveValue('12');
  });

  it('marks used exchanges and the wrap-up exchange on the track', () => {
    render(<Harness initial="4" used={1} />);

    const marks = Array.from(screen.getByTestId('exchange-track').children);
    expect(marks.map((m) => m.getAttribute('data-state'))).toEqual([
      'used',
      'open',
      'open',
      'wrap-up',
    ]);
  });

  it('shows no track without a valid limit', () => {
    render(<Harness initial="" />);

    expect(screen.queryByTestId('exchange-track')).not.toBeInTheDocument();
  });
});
