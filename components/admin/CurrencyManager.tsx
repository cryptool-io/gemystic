'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface RateRow {
  code: string;
  label: string;
  symbol: string;
  rate: number;
  locale: string;
  isBase: boolean;
}

/**
 * Rate editor. Prices are stored in USD and converted at display time, so a
 * change here alters what visitors see and never what an order recorded: a
 * placed order keeps the USD figures it was created with.
 */
export function CurrencyManager({ rates }: { rates: RateRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<RateRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(row: RateRow) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/currencies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(row),
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'Could not save.');
      else {
        setDraft(null);
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() =>
            setDraft({ code: '', label: '', symbol: '', rate: 1, locale: 'en-US', isBase: false })
          }
          className="btn-primary"
        >
          Add currency
        </button>
      </div>

      {draft && (
        <div className="card p-5">
          <h2 className="font-display text-lg">{draft.code ? `Edit ${draft.code}` : 'New currency'}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <F label="Code (e.g. GBP)" value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} />
            <F label="Name" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} />
            <F label="Symbol" value={draft.symbol} onChange={(v) => setDraft({ ...draft, symbol: v })} />
            <F
              label="Units per 1 USD"
              value={String(draft.rate)}
              onChange={(v) => setDraft({ ...draft, rate: Number(v) })}
              type="number"
            />
            <F
              label="Locale (number format)"
              value={draft.locale}
              onChange={(v) => setDraft({ ...draft, locale: v })}
              hint="e.g. en-GB, de-DE"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button onClick={() => save(draft)} disabled={busy} className="btn-primary disabled:opacity-40">
              {busy ? 'Saving…' : 'Save currency'}
            </button>
            <button onClick={() => setDraft(null)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="card scroll-x">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-line text-left text-muted">
            <tr>
              <th className="p-3 font-normal">Currency</th>
              <th className="p-3 font-normal">Symbol</th>
              <th className="p-3 text-right font-normal">Per 1 USD</th>
              <th className="p-3 font-normal">Locale</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rates.map((r) => (
              <tr key={r.code}>
                <td className="p-3">
                  <span className="font-medium">{r.code}</span>
                  <span className="block text-xs text-muted">{r.label}</span>
                </td>
                <td className="p-3 text-muted">{r.symbol}</td>
                <td className="p-3 text-right tabular-nums">{r.rate}</td>
                <td className="p-3 text-muted">{r.locale}</td>
                <td className="p-3 text-right">
                  {r.isBase ? (
                    <span className="chip text-[10px]">Base</span>
                  ) : (
                    <button onClick={() => setDraft(r)} className="text-xs text-brand hover:text-brand-dark">
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field" />
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </div>
  );
}
