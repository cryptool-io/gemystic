'use client';

import { useState } from 'react';
import { SITE } from '@/lib/seo';
import { gaEvent } from '@/components/Analytics';

/**
 * MVP checkout stub. Holds the bag in localStorage so the flow is demonstrable
 * end to end; wiring the Stripe session in is a drop-in replacement for the
 * handler below once keys exist.
 */
export function AddToBag({
  product,
}: {
  product: { slug: string; title: string; price: number };
}) {
  const [state, setState] = useState<'idle' | 'added'>('idle');

  function add() {
    try {
      const bag = JSON.parse(localStorage.getItem('gemystic:bag') || '[]') as typeof product[];
      if (!bag.some((b) => b.slug === product.slug)) bag.push(product);
      localStorage.setItem('gemystic:bag', JSON.stringify(bag));
    } catch {
      // A blocked localStorage shouldn't break the button.
    }
    // Same-tab listeners (header cart badge) and analytics.
    window.dispatchEvent(new Event('gem:bag'));
    gaEvent('add_to_cart', {
      currency: 'USD',
      value: product.price,
      items: [{ item_id: product.slug, item_name: product.title, price: product.price }],
    });
    setState('added');
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button onClick={add} className="btn-primary min-w-40">
        {state === 'added' ? 'Added to bag ✓' : 'Add to bag'}
      </button>
      <a
        href={`mailto:${SITE.email}?subject=${encodeURIComponent(`Question about ${product.title}`)}`}
        className="btn-ghost"
      >
        Ask about this stone
      </a>
    </div>
  );
}
