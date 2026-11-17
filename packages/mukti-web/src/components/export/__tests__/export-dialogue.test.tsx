import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { apiClient } from '@/lib/api/client';

import { ExportDialogue, type ExportTarget } from '../export-dialogue';

jest.mock('@/lib/api/client', () => ({ apiClient: { getBlob: jest.fn() } }));

const targets: [ExportTarget, string][] = [
  [{ conversationId: 'private-chat', surface: 'chat' }, '/conversations/private-chat/export'],
  [
    { nodeId: 'seed', sessionId: 'private-canvas', surface: 'canvas' },
    '/canvas/private-canvas/nodes/seed/dialogue/export',
  ],
  [
    { mapId: 'private-map', nodeId: 'topic/1', surface: 'thought-map' },
    '/thought-maps/private-map/nodes/topic%2F1/dialogue/export',
  ],
];

describe('Export dialogue', () => {
  let click: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    URL.createObjectURL = jest.fn(() => 'blob:export');
    URL.revokeObjectURL = jest.fn();
    click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    (apiClient.getBlob as jest.Mock).mockResolvedValue(new Blob(['export']));
  });
  afterEach(() => click.mockRestore());

  it.each(targets)('downloads %j as metrics JSON using safe filenames', async (target, path) => {
    let filename = '';
    click.mockImplementation(function (this: HTMLAnchorElement) {
      filename = this.download;
    });
    render(<ExportDialogue target={target} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export dialogue' }));
    expect(screen.getByRole('checkbox', { name: 'Metrics only' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() =>
      expect(apiClient.getBlob).toHaveBeenCalledWith(`${path}?format=json&mode=metrics`)
    );
    expect(filename).toBe(`mukti-${target.surface}-export.json`);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('preserves literal punctuation, whitespace, newline, and repeated redact query values', async () => {
    render(<ExportDialogue target={targets[0][0]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export dialogue' }));
    await userEvent.selectOptions(screen.getByLabelText('Format'), 'md');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Metrics only' }));
    const terms = [' .*+?[]{}()\\^$|,&=\n ', ' '];
    for (const [index, term] of terms.entries()) {
      await userEvent.click(screen.getByRole('button', { name: 'Add redaction string' }));
      fireEvent.change(screen.getByLabelText(`Redaction string ${index + 1}`), {
        target: { value: term },
      });
    }
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    const query = new URLSearchParams(
      (apiClient.getBlob as jest.Mock).mock.calls[0][0].split('?')[1]
    );
    expect(query.getAll('redact')).toEqual(terms);
    expect(query.get('format')).toBe('md');
    expect(query.get('mode')).toBe('full');
  });

  it('enforces 1..200 characters and 50 terms without forbidding literal characters', async () => {
    render(<ExportDialogue target={targets[0][0]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export dialogue' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add redaction string' }));
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Redaction string 1'), {
      target: { value: 'a'.repeat(201) },
    });
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Redaction string 1'), {
      target: { value: 'a'.repeat(200) },
    });
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
    for (let i = 1; i < 50; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Add redaction string' }));
    }
    expect(screen.getByRole('button', { name: 'Add redaction string' })).toBeDisabled();
  });

  it('keeps the dialog open with a retryable error on failure', async () => {
    (apiClient.getBlob as jest.Mock).mockRejectedValue(new Error('No access'));
    render(<ExportDialogue target={targets[0][0]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export dialogue' }));
    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed');
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
  });
});
