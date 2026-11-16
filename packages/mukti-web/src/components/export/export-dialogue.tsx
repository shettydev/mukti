'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api/client';

export type ExportTarget =
  | { conversationId: string; surface: 'chat' }
  | { mapId: string; nodeId: string; surface: 'thought-map' }
  | { nodeId: string; sessionId: string; surface: 'canvas' };

/** Each entry is kept verbatim, including whitespace, punctuation and newlines. */
export function ExportDialogue({ target }: { target: ExportTarget }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'json' | 'md'>('json');
  const [metrics, setMetrics] = useState(true);
  const [terms, setTerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const invalid = terms.some((term) => term.length < 1 || term.length > 200);

  async function download() {
    if (invalid || busy) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      const query = new URLSearchParams({ format, mode: metrics ? 'metrics' : 'full' });
      terms.forEach((term) => query.append('redact', term));
      const blob = await apiClient.getBlob(`${exportPath(target)}?${query}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Never use server filenames, user titles, or database identifiers.
      link.download = `mukti-${target.surface}-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setOpen(false);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Export dialogue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export dialogue</DialogTitle>
          <DialogDescription>
            Download a local copy. Metrics only excludes message text and titles. Review full
            transcripts before sharing.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={`${id}-format`}>Format</label>
        <select
          className="rounded-md border bg-background p-2"
          id={`${id}-format`}
          onChange={(event) => setFormat(event.target.value as 'json' | 'md')}
          value={format}
        >
          <option value="json">JSON</option>
          <option value="md">Markdown</option>
        </select>
        <label className="flex items-center gap-2">
          <input
            checked={metrics}
            onChange={(event) => setMetrics(event.target.checked)}
            type="checkbox"
          />
          Metrics only
        </label>
        <fieldset className="space-y-2">
          <legend>Redaction strings (optional)</legend>
          <p className="text-sm text-muted-foreground">
            Up to 50 literal strings, 1 to 200 characters each. Matches ignore case.
          </p>
          {terms.map((term, index) => (
            <div className="flex items-start gap-2" key={index}>
              <textarea
                aria-label={`Redaction string ${index + 1}`}
                className="min-w-0 flex-1 rounded-md border bg-background p-2"
                onChange={(event) =>
                  setTerms(terms.map((value, i) => (i === index ? event.target.value : value)))
                }
                value={term}
              />
              <Button
                aria-label={`Remove redaction string ${index + 1}`}
                onClick={() => setTerms(terms.filter((_, i) => i !== index))}
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            disabled={terms.length >= 50}
            onClick={() => setTerms([...terms, ''])}
            variant="outline"
          >
            Add redaction string
          </Button>
        </fieldset>
        {invalid && <p role="alert">Each redaction string must contain 1 to 200 characters.</p>}
        {error && <p role="alert">{error}</p>}
        <DialogFooter>
          <Button disabled={busy} onClick={() => setOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={busy || invalid} onClick={() => void download()}>
            {busy ? 'Downloading…' : 'Download'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function exportPath(target: ExportTarget): string {
  const encode = encodeURIComponent;
  if (target.surface === 'chat') {
    return `/conversations/${encode(target.conversationId)}/export`;
  }
  const parent =
    target.surface === 'canvas'
      ? `canvas/${encode(target.sessionId)}`
      : `thought-maps/${encode(target.mapId)}`;
  return `/${parent}/nodes/${encode(target.nodeId)}/dialogue/export`;
}
