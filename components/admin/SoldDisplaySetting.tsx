'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Admin control: how long sold stones stay visible before dropping out. */
export function SoldDisplaySetting({ current }: { current: number }) {
  const router = useRouter();
  const [days, setDays] = useState(current);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ soldDisplayDays: days }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error ?? 'Could not save.');
      else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-base">Sold stones on display</h2>
      <p className="mt-1 text-sm text-muted">
        A sold stone shows a SOLD banner for this many days, then leaves the listings
        automatically (its page stays reachable for old links). Recently sold stock is
        social proof; months-old sold stock is clutter.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={90}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="field w-24"
          aria-label="Days sold stones stay visible"
        />
        <span className="text-sm text-muted">days</span>
        <button onClick={save} disabled={busy} className="btn-primary py-2 disabled:opacity-40">
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && <span className="text-sm text-brand">Saved ✓</span>}
      </div>
      {error && <p className="mt-2 text-xs text-accent-dark">{error}</p>}
      <p className="mt-2 text-xs text-subtle">0 removes sold stones immediately.</p>
    </div>
  );
}
