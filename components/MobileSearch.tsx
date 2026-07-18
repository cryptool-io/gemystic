'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { SearchBox } from './SearchBox';

/**
 * Phone search: a magnifier in the header that drops a full-width search row
 * beneath it. On desktop the inline SearchBox shows instead, so this renders
 * only below lg.
 */
export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the field as the row opens.
    ref.current?.querySelector('input')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Search stones"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-fg transition hover:border-brand-ring hover:text-brand"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={ref}
          className="absolute inset-x-0 top-full border-b border-line bg-surface p-3 shadow-card"
        >
          <Suspense fallback={null}>
            <SearchBox compact onNavigate={() => setOpen(false)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
