'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SavedItem {
  slug: string;
  title: string;
  price: number;
  image?: string;
  /** Filled from the live catalogue; false means it sold since being saved. */
  stillAvailable?: boolean;
}

/**
 * Reads the local bag/saved store and reconciles it against live stock, a
 * saved one-of-a-kind stone may have sold, and pretending otherwise would be a
 * broken promise at checkout. Persisted client-side until the DB migration.
 */
export function SavedStones() {
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let saved: SavedItem[] = [];
      try {
        saved = JSON.parse(localStorage.getItem('gemystic:bag') || '[]');
      } catch {
        saved = [];
      }

      // Reconcile against the live catalogue.
      const checked = await Promise.all(
        saved.map(async (item) => {
          try {
            const res = await fetch(`/api/catalog?slug=${encodeURIComponent(item.slug)}`);
            if (!res.ok) return { ...item, stillAvailable: false };
            const data = await res.json();
            return {
              ...item,
              image: data.product?.image ?? item.image,
              stillAvailable: data.product?.availability === 'in_stock',
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
  }

  if (items === null) {
    return <p className="text-sm text-muted">Loading your saved stones…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display text-lg">Nothing saved yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Tap “Add to bag” on any stone to keep it here while you decide.
        </p>
        <Link href="/shop" className="btn-primary mt-5">Browse the stones</Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.slug} className="card flex items-center gap-4 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.image && (
            <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/gem/${item.slug}`} className="block truncate text-sm font-medium text-fg hover:text-brand">
              {item.title}
            </Link>
            <div className="mt-0.5 text-sm text-brand">${item.price.toFixed(2)}</div>
            {item.stillAvailable === false && (
              <span className="chip mt-1 border-accent/40 text-accent-dark">
                No longer available
              </span>
            )}
          </div>
          <button onClick={() => remove(item.slug)} className="btn-ghost px-3 py-1.5 text-xs">
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
