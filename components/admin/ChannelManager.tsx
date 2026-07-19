'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Where this stone is listed, one row per channel. The website row is managed
 * by publishing rather than here, so the two cannot disagree about whether the
 * stone is actually in the shop.
 */
export function ChannelManager({
  productId,
  channels,
  current,
}: {
  productId: string;
  channels: { value: string; label: string }[];
  current: Record<string, { status: string; listingUrl: string }>;
}) {
  const router = useRouter();
  const [state, setState] = useState(current);
  const [busy, setBusy] = useState<string | null>(null);

  async function save(channel: string, status: string, listingUrl: string) {
    setBusy(channel);
    setState((s) => ({ ...s, [channel]: { status, listingUrl } }));
    try {
      await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'set-channel', productId, channel, status, listingUrl }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg">Listed on</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        The website row follows the publish button above, so the two cannot disagree.
      </p>

      <div className="mt-4 space-y-2">
        {channels.map((c) => {
          const row = state[c.value] ?? { status: 'not_listed', listingUrl: '' };
          const isWeb = c.value === 'web';
          return (
            <div key={c.value} className="rounded-lg border border-line p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-sm text-muted">{c.label}</span>
                <select
                  value={row.status}
                  disabled={isWeb || busy === c.value}
                  onChange={(e) => save(c.value, e.target.value, row.listingUrl)}
                  className="field w-32 py-1 text-xs disabled:opacity-50"
                  aria-label={`${c.label} status`}
                >
                  <option value="not_listed">Not listed</option>
                  <option value="draft">Draft</option>
                  <option value="listed">Listed</option>
                  <option value="sold">Sold</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              {!isWeb && row.status !== 'not_listed' && (
                <input
                  defaultValue={row.listingUrl}
                  onBlur={(e) => save(c.value, row.status, e.target.value)}
                  placeholder="Listing URL"
                  aria-label={`${c.label} listing URL`}
                  className="field mt-2 py-1 text-xs"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
