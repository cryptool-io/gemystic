'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Campaign } from '@/lib/campaigns/store';

interface Option {
  key?: string;
  slug?: string;
  name: string;
}

export function CampaignManager({
  campaigns,
  species,
  categories,
}: {
  campaigns: Campaign[];
  species: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy('create');
    setError(null);
    const f = new FormData(e.currentTarget);

    const res = await fetch('/api/admin/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: f.get('name'),
        percentOff: Number(f.get('percentOff')),
        startsAt: f.get('startsAt'),
        endsAt: f.get('endsAt'),
        species: f.getAll('species').map(String),
        categories: f.getAll('categories').map(String),
        active: true,
      }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok || data.error) {
      setError(data.error ?? 'Could not create the campaign.');
      return;
    }
    setCreating(false);
    router.refresh();
  }

  async function toggle(c: Campaign) {
    setBusy(c.id);
    await fetch('/api/admin/campaigns', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/admin/campaigns?id=${id}`, { method: 'DELETE' });
    setBusy(null);
    router.refresh();
  }

  const now = new Date();

  return (
    <div className="space-y-4">
      {campaigns.length === 0 && !creating && (
        <p className="card p-6 text-sm text-muted">
          No campaigns yet. Create one to run your first offer.
        </p>
      )}

      {campaigns.map((c) => {
        const ended = new Date(c.endsAt) < now && !sameDay(new Date(c.endsAt), now);
        const running =
          c.active && new Date(c.startsAt) <= now && !ended;
        return (
          <div key={c.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg">{c.name}</span>
                  <span className="chip-brand">−{c.percentOff}%</span>
                  <span
                    className={`chip ${
                      running ? 'chip-brand' : ended ? '' : 'border-accent/40 text-accent-dark'
                    }`}
                  >
                    {running ? 'live' : ended ? 'ended' : c.active ? 'scheduled' : 'paused'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {fmtDate(c.startsAt)} → {fmtDate(c.endsAt)} ·{' '}
                  {c.species.length === 0 && c.categories.length === 0
                    ? 'all stones'
                    : [
                        c.species.length > 0 && `stones: ${c.species.join(', ')}`,
                        c.categories.length > 0 && `categories: ${c.categories.join(', ')}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(c)}
                  disabled={busy === c.id}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  {c.active ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => remove(c.id)}
                  disabled={busy === c.id}
                  className="btn-ghost px-3 py-1.5 text-xs text-accent-dark disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {creating ? (
        <form onSubmit={onCreate} className="card p-5 sm:p-6">
          <h2 className="font-display text-lg">New campaign</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="label mb-1.5 block">Name (shown to customers)</label>
              <input id="c-name" name="name" required placeholder="Summer peridot offer" className="field" />
            </div>
            <div>
              <label htmlFor="c-pct" className="label mb-1.5 block">Discount %</label>
              <input id="c-pct" name="percentOff" type="number" min={1} max={90} required className="field" />
            </div>
            <div>
              <label htmlFor="c-start" className="label mb-1.5 block">Starts</label>
              <input id="c-start" name="startsAt" type="date" required className="field" />
            </div>
            <div>
              <label htmlFor="c-end" className="label mb-1.5 block">Ends (inclusive)</label>
              <input id="c-end" name="endsAt" type="date" required className="field" />
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="label mb-2">Stone types (none selected = all)</legend>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-line p-3">
                {species.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name="species" value={s.key} className="accent-brand" />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label mb-2">Categories (none selected = all)</legend>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-line p-3">
                {categories.map((c) => (
                  <label key={c.slug} className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name="categories" value={c.slug} className="accent-brand" />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
              {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={busy === 'create'} className="btn-primary disabled:opacity-40">
              {busy === 'create' ? 'Creating…' : 'Launch campaign'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setCreating(true)} className="btn-primary">
          + New campaign
        </button>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}
