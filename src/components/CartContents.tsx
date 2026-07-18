'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/currency';
import { useCurrency } from '@/components/currency/CurrencyProvider';
import { SITE } from '@/lib/seo';

interface BagItem {
  slug: string;
  title: string;
  price: number; // USD
  image?: string;
  available?: boolean;
  species?: string;
}

interface Promo {
  code: string;
  name: string;
  percentOff: number;
  freeShipping: boolean;
  species: string[];
  categories: string[];
}

/**
 * Bag contents, reconciled against live stock on load: a one-of-a-kind stone
 * in the bag may have sold, and the subtotal must never include it.
 *
 * Money rules: totals are computed in USD and formatted in the visitor's
 * currency through the one shared conversion path. Promo discounts round per
 * item and then sum, the same rule the server applies, so cart, checkout and
 * invoice can never disagree by a cent. The code shown here is re-validated
 * server-side at checkout; the client cannot invent a percentage.
 */
export function CartContents() {
  const [items, setItems] = useState<BagItem[] | null>(null);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const { currency } = useCurrency();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let bag: BagItem[] = [];
      try {
        bag = JSON.parse(localStorage.getItem('gemystic:bag') || '[]');
      } catch {
        bag = [];
      }

      const checked = await Promise.all(
        bag.map(async (item) => {
          try {
            const res = await fetch(`/api/catalog?slug=${encodeURIComponent(item.slug)}`);
            if (!res.ok) return { ...item, available: false };
            const data = await res.json();
            return {
              ...item,
              image: data.product?.image,
              // Live price wins over whatever was stored: campaigns start and end.
              price: data.product?.price?.amount ?? item.price,
              available: data.product?.availability === 'in_stock',
              species: data.product?.gem?.species,
            };
          } catch {
            return item;
          }
        }),
      );
      if (!cancelled) setItems(checked);

      // Restore a previously applied promo code, revalidating it server-side.
      const saved = localStorage.getItem('gemystic:promo');
      if (saved && !cancelled) {
        try {
          const res = await fetch(`/api/promo?code=${encodeURIComponent(saved)}`);
          const data = await res.json();
          if (res.ok && data.valid) setPromo({ code: saved, ...data });
          else localStorage.removeItem('gemystic:promo');
        } catch {
          // Best-effort restore.
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function remove(slug: string) {
    const next = (items ?? []).filter((i) => i.slug !== slug);
    setItems(next);
    localStorage.setItem(
      'gemystic:bag',
      JSON.stringify(next.map(({ slug, title, price }) => ({ slug, title, price }))),
    );
    window.dispatchEvent(new Event('gem:bag'));
  }

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const res = await fetch(`/api/promo?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPromoError(data.error ?? 'That code is not valid.');
      } else {
        const upper = code.toUpperCase();
        setPromo({ code: upper, ...data });
        localStorage.setItem('gemystic:promo', upper);
        setPromoInput('');
      }
    } catch {
      setPromoError('Could not check the code.');
    } finally {
      setPromoBusy(false);
    }
  }

  function clearPromo() {
    setPromo(null);
    localStorage.removeItem('gemystic:promo');
  }

  if (items === null) return <p className="text-sm text-muted">Loading your bag…</p>;

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-lg">Your bag is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Found a stone you like? Add it here while you decide.
        </p>
        <Link href="/shop" className="btn-primary mt-5">Browse the stones</Link>
      </div>
    );
  }

  const availableItems = items.filter((i) => i.available !== false);
  const subtotalUsd = availableItems.reduce((a, i) => a + i.price, 0);

  // Promo scope: empty species array means the code covers everything.
  const inScope = (i: BagItem) =>
    !promo || promo.species.length === 0 || (i.species ? promo.species.includes(i.species) : false);

  const discountUsd = promo
    ? availableItems.reduce(
        (a, i) => (inScope(i) ? a + Math.round(i.price * promo.percentOff) / 100 : a),
        0,
      )
    : 0;
  const totalUsd = Math.round((subtotalUsd - discountUsd) * 100) / 100;
  const freeShipping =
    totalUsd >= SITE.policy.freeShippingOver || Boolean(promo?.freeShipping);

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.slug}
            className={`card flex items-center gap-4 p-4 ${item.available === false ? 'opacity-60' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.image && (
              <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/gem/${item.slug}`} className="block truncate text-sm font-medium text-fg hover:text-brand">
                {item.title}
              </Link>
              <div className="mt-0.5 text-sm text-brand">{formatMoney(item.price, currency)}</div>
              <div className="mt-0.5 text-xs text-muted">Ships from Pakistan</div>
              {item.available === false && (
                <span className="chip mt-1 border-accent/40 text-accent-dark">
                  Sold, removed from total
                </span>
              )}
            </div>
            <button onClick={() => remove(item.slug)} className="btn-ghost px-3 py-1.5 text-xs">
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* Discount code */}
      <div className="card p-5">
        {promo ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="chip-brand">
              {promo.code} · {promo.name}
              {promo.percentOff > 0 ? ` · −${promo.percentOff}%` : ''}
              {promo.freeShipping ? ' · free shipping' : ''}
            </span>
            <button onClick={clearPromo} className="text-xs text-muted underline hover:text-brand-dark">
              Remove code
            </button>
          </div>
        ) : (
          <div>
            <label htmlFor="promo" className="label mb-1.5 block">Discount code</label>
            <div className="flex gap-2">
              <input
                id="promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="e.g. SUMMER15"
                className="field flex-1 uppercase"
              />
              <button onClick={applyPromo} disabled={promoBusy} className="btn-ghost disabled:opacity-40">
                {promoBusy ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {promoError && <p className="mt-2 text-xs text-accent-dark">{promoError}</p>}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Subtotal ({availableItems.length} {availableItems.length === 1 ? 'stone' : 'stones'})
          </span>
          <span className={discountUsd > 0 ? 'text-muted' : 'font-display text-xl text-brand'}>
            {formatMoney(subtotalUsd, currency)}
          </span>
        </div>

        {discountUsd > 0 && (
          <>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted">Discount ({promo?.code})</span>
              <span className="text-brand">−{formatMoney(discountUsd, currency)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm">
              <span className="text-muted">Total</span>
              <span className="font-display text-xl text-brand">{formatMoney(totalUsd, currency)}</span>
            </div>
          </>
        )}

        <p className="mt-2 text-xs text-muted">
          {freeShipping
            ? 'Qualifies for free insured worldwide shipping.'
            : `Free worldwide shipping from ${formatMoney(SITE.policy.freeShippingOver, currency)}. Below that, insured shipping is calculated at checkout.`}
        </p>

        <div className="mt-4 space-y-2">
          <a
            href={`${SITE.whatsapp}?text=${encodeURIComponent(
              `Hello! I'd like to buy: ${availableItems.map((i) => i.title).join(', ')} (total ${formatMoney(totalUsd, currency)}${promo ? `, code ${promo.code}` : ''})`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full"
          >
            Order via personal concierge
          </a>
        </div>
        <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-muted">
          <span className="font-medium text-fg">How ordering works:</span> message us, we
          confirm the stone is yours and send a secure PayPal invoice or card link, then it
          ships insured with tracking. Payment is covered by PayPal Buyer Protection.
        </div>
      </div>
    </div>
  );
}
