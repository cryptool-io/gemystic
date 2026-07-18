'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Order actions. Every button posts to /api/admin/orders and refreshes the
 * server component, so the page never holds a second copy of order state that
 * could drift from the database.
 */
export function OrderActions({
  orderNumber,
  status,
  hasShipment,
}: {
  orderNumber: string;
  status: string;
  hasShipment: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [carrier, setCarrier] = useState('DHL Express');
  const [tracking, setTracking] = useState('');
  const [shipsFrom, setShipsFrom] = useState<'PK' | 'TH'>('PK');

  async function act(action: string, extra: Record<string, unknown> = {}, key = action) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'That did not work.');
        setBusy(null);
        return;
      }
      router.refresh();
      setBusy(null);
    } catch {
      setError('Could not reach the server.');
      setBusy(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg">Actions</h2>

      {error && (
        <p className="mt-3 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {status === 'pending' && (
          <div>
            <button
              onClick={() => act('confirm-manual-payment')}
              disabled={busy !== null}
              className="btn-primary w-full disabled:opacity-40"
            >
              {busy === 'confirm-manual-payment' ? 'Confirming…' : 'Confirm payment received'}
            </button>
            <p className="mt-1.5 text-xs text-muted">
              For bank transfer, cash or a concierge deal. Sends the confirmation and invoice to
              the customer and marks the stones sold.
            </p>
          </div>
        )}

        {status === 'paid' && (
          <button
            onClick={() => act('advance', { status: 'processing' })}
            disabled={busy !== null}
            className="btn-primary w-full disabled:opacity-40"
          >
            {busy === 'advance' ? 'Updating…' : 'Start preparing (notifies customer)'}
          </button>
        )}

        {['paid', 'processing'].includes(status) && !hasShipment && (
          <div className="rounded-lg border border-line p-4">
            <div className="label mb-2">Dispatch</div>
            <div className="space-y-2">
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Carrier"
                className="field py-1.5 text-sm"
              />
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Tracking number"
                className="field py-1.5 text-sm"
              />
              <select
                value={shipsFrom}
                onChange={(e) => setShipsFrom(e.target.value as 'PK' | 'TH')}
                className="field py-1.5 text-sm"
              >
                <option value="PK">Ships from Pakistan</option>
                <option value="TH">Ships from Thailand</option>
              </select>
              <button
                onClick={() => act('ship', { carrier, trackingNumber: tracking, shipsFrom })}
                disabled={busy !== null}
                className="btn-primary w-full disabled:opacity-40"
              >
                {busy === 'ship' ? 'Dispatching…' : 'Mark shipped and email tracking'}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Generates the commercial invoice, packing list and certificate of origin, then
              emails the customer their tracking link.
            </p>
          </div>
        )}

        {status === 'shipped' && (
          <button
            onClick={() => act('advance', { status: 'delivered' })}
            disabled={busy !== null}
            className="btn-primary w-full disabled:opacity-40"
          >
            {busy === 'advance' ? 'Updating…' : 'Mark delivered (asks for a review)'}
          </button>
        )}

        {!['cancelled', 'refunded', 'delivered'].includes(status) && (
          <button
            onClick={() => act('advance', { status: 'cancelled' }, 'cancel')}
            disabled={busy !== null}
            className="btn-ghost w-full text-accent-dark disabled:opacity-40"
          >
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}
      </div>
    </div>
  );
}
