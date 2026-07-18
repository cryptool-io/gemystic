'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Runs the Etsy sold-sync on demand (the same check `npm run etsy:sync`
 * performs), so the owner does not need a terminal to reconcile channels after
 * selling a stone on Etsy.
 */
export function EtsySyncButton({ slug }: { slug?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/etsy-sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(slug ? { slug } : {}),
      });
      const data = await res.json();
      setResult(res.ok && !data.error ? (data.message ?? 'Synced.') : (data.error ?? 'Sync failed.'));
      if (res.ok) router.refresh();
    } catch {
      setResult('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={sync} disabled={busy} className="btn-ghost disabled:opacity-40">
        {busy ? 'Syncing…' : slug ? 'Sync this listing with Etsy' : 'Sync Etsy'}
      </button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </div>
  );
}
