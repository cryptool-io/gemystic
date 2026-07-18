'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/currency';
import { useCurrency } from '@/components/currency/CurrencyProvider';

interface QuoteLine {
  slug: string;
  title: string;
  image: string;
  unitPrice: number;
  discounted: boolean;
}

interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  freeShipping: boolean;
  promoName: string | null;
  unavailable: string[];
  shippingOptions: Record<'normal' | 'express', { label: string; usd: number; days: string }>;
}

/**
 * Checkout: address, shipping choice, server-priced summary.
 *
 * The page never computes money. It posts the cart to /api/checkout/quote and
 * renders what comes back, so the figure on screen is the figure the order is
 * created with. Fields follow the owner's flow: name, address AND phone, the
 * last because international couriers refuse parcels without one.
 */
export function CheckoutForm({
  defaults,
}: {
  defaults: { email: string; fullName: string } | null;
}) {
  const router = useRouter();
  const { currency, currencies } = useCurrency();

  const [slugs, setSlugs] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [method, setMethod] = useState<'normal' | 'express'>('normal');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const bag = JSON.parse(localStorage.getItem('gemystic:bag') || '[]') as { slug: string }[];
      setSlugs(bag.map((b) => b.slug));
    } catch {
      setSlugs([]);
    }
    setPromoCode(localStorage.getItem('gemystic:promo'));
  }, []);

  useEffect(() => {
    if (slugs.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slugs, promoCode, shippingMethod: method }),
    })
      .then((r) => r.json())
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setError('Could not price your cart. Please reload.');
      });
    return () => {
      cancelled = true;
    };
  }, [slugs, promoCode, method]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const address = Object.fromEntries(form) as Record<string, string>;

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slugs,
          promoCode,
          shippingMethod: method,
          customerNote: address.customerNote,
          address,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? 'Could not place the order.');
        setBusy(false);
        return;
      }
      router.push(`/checkout/${data.orderNumber}`);
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    }
  }

  if (slugs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-lg">Your cart is empty</p>
        <Link href="/shop" className="btn-primary mt-5">Browse the stones</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="font-display text-lg">Where is it going?</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label="Full name" required defaultValue={defaults?.fullName} autoComplete="name" />
            <Field name="email" label="Email" type="email" required defaultValue={defaults?.email} autoComplete="email" />
            <Field name="phone" label="Phone (for the courier)" required autoComplete="tel" />
            <Field name="countryCode" label="Country code (e.g. GB)" required maxLength={2} autoComplete="country" className="uppercase" />
            <div className="sm:col-span-2">
              <Field name="line1" label="Address" required autoComplete="address-line1" />
            </div>
            <div className="sm:col-span-2">
              <Field name="line2" label="Address line 2 (optional)" autoComplete="address-line2" />
            </div>
            <Field name="city" label="City" required autoComplete="address-level2" />
            <Field name="region" label="State / region (optional)" autoComplete="address-level1" />
            <Field name="postcode" label="Postcode" autoComplete="postal-code" />
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg">Shipping</h2>
          <div className="mt-4 space-y-3">
            {(['normal', 'express'] as const).map((key) => {
              const opt = quote?.shippingOptions?.[key];
              const free = key === 'normal' && quote?.freeShipping;
              return (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    method === key ? 'border-brand bg-brand-tint/40' : 'border-line hover:border-brand-ring'
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={key}
                    checked={method === key}
                    onChange={() => setMethod(key)}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-fg">
                      {opt?.label ?? (key === 'normal' ? 'Normal' : 'Express')}
                    </span>
                    <span className="block text-xs text-muted">{opt?.days ?? ''}</span>
                  </span>
                  <span className="text-sm text-brand">
                    {free ? 'Free' : formatMoney(opt?.usd ?? 0, currency, currencies)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4">
            <label htmlFor="customerNote" className="label mb-1.5 block">
              Anything we should know? (optional)
            </label>
            <textarea id="customerNote" name="customerNote" rows={3} className="field" />
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="font-display text-lg">Your order</h2>

          {quote === null ? (
            <p className="mt-3 text-sm text-muted">Pricing your cart…</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {quote.lines.map((l) => (
                  <li key={l.slug} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-muted">{l.title}</span>
                    <span className="text-fg">{formatMoney(l.unitPrice, currency, currencies)}</span>
                  </li>
                ))}
              </ul>

              {quote.unavailable.length > 0 && (
                <p className="mt-3 rounded-lg border border-accent/40 bg-accent-tint p-2.5 text-xs text-accent-dark">
                  {quote.unavailable.length} stone{quote.unavailable.length === 1 ? '' : 's'} sold
                  while in your cart and {quote.unavailable.length === 1 ? 'was' : 'were'} removed.
                </p>
              )}

              <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <Row label="Subtotal" value={formatMoney(quote.subtotal, currency, currencies)} />
                {quote.discount > 0 && (
                  <Row
                    label={`Discount${quote.promoName ? ` (${quote.promoName})` : ''}`}
                    value={`−${formatMoney(quote.discount, currency, currencies)}`}
                    accent
                  />
                )}
                <Row
                  label="Shipping"
                  value={quote.shipping === 0 ? 'Free' : formatMoney(quote.shipping, currency, currencies)}
                />
                <div className="flex items-baseline justify-between border-t border-line pt-2">
                  <dt className="text-muted">Total</dt>
                  <dd className="font-display text-xl text-brand">
                    {formatMoney(quote.grandTotal, currency, currencies)}
                  </dd>
                </div>
              </dl>
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-accent/40 bg-accent-tint p-3 text-sm text-accent-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !quote || quote.lines.length === 0}
            className="btn-primary mt-5 w-full disabled:opacity-40"
          >
            {busy ? 'Placing order…' : 'Continue to payment'}
          </button>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Every stone is one of a kind. Yours is held for you from the moment this order is
            placed, and released if payment is not completed.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={accent ? 'text-brand' : 'text-fg'}>{value}</dd>
    </div>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  defaultValue,
  autoComplete,
  maxLength,
  className = '',
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
  maxLength?: number;
  className?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label mb-1.5 block">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        maxLength={maxLength}
        className={`field ${className}`}
      />
    </div>
  );
}
