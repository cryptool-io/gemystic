'use client';

import { useEffect, useState } from 'react';

/**
 * Shows when another visitor added this stone to their cart within the last
 * 30 minutes. Real signal only, the API records genuine add-to-cart events and
 * they expire; nothing here is manufactured urgency.
 */
export function InterestBadge({ slug }: { slug: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/interest?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.active) setActive(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!active) return null;

  return (
    <p className="mt-3 flex items-center gap-2 text-sm text-accent-dark">
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 4h2l1.6 9.2a1.5 1.5 0 001.5 1.3h6.9a1.5 1.5 0 001.5-1.2L18 7H6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="17" r="1.2" fill="currentColor" />
        <circle cx="14.5" cy="17" r="1.2" fill="currentColor" />
      </svg>
      This stone is in someone&rsquo;s cart right now. It stays on sale until purchase
      completes, if you want it, do not wait.
    </p>
  );
}
