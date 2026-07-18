'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

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
        className="field py-2"
      />
    </form>
  );
}
