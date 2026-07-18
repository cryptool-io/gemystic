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
}

/**
 * Bag contents, reconciled against live stock on load — a one-of-a-kind stone
 * in the bag may have sold, and the subtotal must never include it. Totals are
 * computed in USD and formatted in the visitor's currency by the same
 * conversion path as every other price.
 */
export function CartContents() {
  const [items, setItems] = useState<BagItem[] | null>(null);
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
              // Live price wins over whatever was stored — campaigns start/end.
              price: data.product?.price?.amount ?? item.price,
              available: data.product?.availability === 'in_stock',
            };
          } catch {
            return item;
          }
        }),
      );
      if (!cancelled) setItems(checked);
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
  const freeShipping = subtotalUsd >= SITE.policy.freeShippingOver;

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.slug} className={`card flex items-center gap-4 p-4 ${item.available === false ? 'opacity-60' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {item.image && (
              <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/gem/${item.slug}`} className="block truncate text-sm font-medium text-fg hover:text-brand">
                {item.title}
              </Link>
              <div className="mt-0.5 text-sm text-brand">{formatMoney(item.price, currency)}</div>
              {item.available === false && (
                <span className="chip mt-1 border-accent/40 text-accent-dark">
                  Sold — removed from total
                </span>
              )}
            </div>
            <button onClick={() => remove(item.slug)} className="btn-ghost px-3 py-1.5 text-xs">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Subtotal ({availableItems.length} {availableItems.length === 1 ? 'stone' : 'stones'})</span>
          <span className="font-display text-xl text-brand">{formatMoney(subtotalUsd, currency)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          {freeShipping
            ? 'Qualifies for free insured worldwide shipping.'
            : `Free worldwide shipping from ${formatMoney(SITE.policy.freeShippingOver, currency)} — insured shipping is calculated at checkout below that.`}
        </p>

        <div className="mt-4 space-y-2">
          <button disabled className="btn-primary w-full opacity-50" title="Checkout is being built">
            Checkout — coming soon
          </button>
          <a
            href={`${SITE.whatsapp}?text=${encodeURIComponent(
              `Hello! I'd like to buy: ${availableItems.map((i) => i.title).join(', ')} (subtotal ${formatMoney(subtotalUsd, currency)})`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost w-full"
          >
            Order now via WhatsApp
          </a>
        </div>
        <p className="mt-3 text-xs text-subtle">
          Online payment (Stripe, PayPal) arrives with the checkout build. Until then we
          confirm availability and take payment securely through WhatsApp or email —
          fastest way to make a stone yours.
        </p>
      </div>
    </div>
  );
}
