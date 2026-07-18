'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Header cart with a live badge. The bag lives in localStorage until checkout
 * lands on the database; AddToBag dispatches `gem:bag` so the badge updates in
 * the same tab, and the storage event covers other tabs.
 */
export function CartIcon() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const readCount = () => {
      try {
        setCount(JSON.parse(localStorage.getItem('gemystic:bag') || '[]').length);
      } catch {
        setCount(0);
      }
    };
    readCount();
    window.addEventListener('gem:bag', readCount);
    window.addEventListener('storage', readCount);
    return () => {
      window.removeEventListener('gem:bag', readCount);
      window.removeEventListener('storage', readCount);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg transition hover:border-brand-ring hover:text-brand"
    >
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 4h2l1.6 9.2a1.5 1.5 0 001.5 1.3h6.9a1.5 1.5 0 001.5-1.2L18 7H6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="17" r="1.2" fill="currentColor" />
        <circle cx="14.5" cy="17" r="1.2" fill="currentColor" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
