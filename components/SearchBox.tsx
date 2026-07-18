'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { gaEvent } from '@/components/Analytics';

/**
 * Submits to /shop, where the existing relevance ranking does the work. Kept as a
 * real form with an action so it still functions before hydration completes.
 */
export function SearchBox({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  return (
    <form
      action="/shop"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) gaEvent('search', { search_term: q.trim() });
        router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
        onNavigate?.();
      }}
      className={compact ? 'w-full' : 'hidden w-44 lg:block xl:w-56'}
      role="search"
    >
      <label htmlFor={compact ? 'site-search-mobile' : 'site-search'} className="sr-only">
        Search gemstones
      </label>
      <input
        id={compact ? 'site-search-mobile' : 'site-search'}
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stones…"
        // h-10 matches the currency switcher, cart and account controls beside
        // it; the default field padding made this the one tall element in the row.
        className="field h-10 py-0"
      />
    </form>
  );
}
