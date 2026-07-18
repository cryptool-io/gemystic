'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_CARDS, DEMO_NOTICE } from '@/lib/payments';

/**
 * Demo card form. Deliberately looks like a payment form and behaves like one
 * (validation, decline path, disabled while charging) so the flow being tested
 * is the real flow, but nothing is transmitted anywhere and no card data is
 * stored, which is why the notice is impossible to miss.
 */
export function PaymentPanel({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [card, setCard] = useState<string>(DEMO_CARDS.success);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/pay', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber, cardNumber: card }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Payment failed.');
        setBusy(false);
        return;
      }
      // Cart is done: clear it before showing the confirmation.
      localStorage.removeItem('gemystic:bag');
      localStorage.removeItem('gemystic:promo');
      window.dispatchEvent(new Event('gem:bag'));
      router.push(`/order/${orderNumber}?paid=1`);
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="card p-6">
      <h2 className="font-display text-lg">Payment</h2>

      <p className="mt-3 rounded-lg border border-accent/40 bg-accent-tint p-3 text-xs leading-relaxed text-accent-dark">
        {DEMO_NOTICE}
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="card" className="label mb-1.5 block">Card number</label>
          <input
            id="card"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            inputMode="numeric"
            className="field tabular-nums"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="exp" className="label mb-1.5 block">Expiry</label>
            <input id="exp" defaultValue="12 / 30" className="field tabular-nums" />
          </div>
          <div>
            <label htmlFor="cvc" className="label mb-1.5 block">CVC</label>
            <input id="cvc" defaultValue="123" className="field tabular-nums" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCard(DEMO_CARDS.success)}
          className="chip hover:border-brand-ring"
        >
          Use success card
        </button>
        <button
          type="button"
          onClick={() => setCard(DEMO_CARDS.decline)}
          className="chip hover:border-brand-ring"
        >
          Use declining card
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-40">
        {busy ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}
