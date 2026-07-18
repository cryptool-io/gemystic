'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CURRENCIES } from '@/lib/currency';
import { useCurrency } from './CurrencyProvider';

/**
 * Language + currency switcher (globe control). Currency is fully functional —
 * USD/EUR today, more by adding entries to data/currencies.json. Language lists
 * English only until translations exist; showing the control now fixes the
 * expectation and gives the i18n rollout a home.
 */
export function LocaleSwitcher() {
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Language and currency"
        className="btn-ghost gap-1.5 px-2.5 py-2 text-xs"
      >
        <GlobeIcon />
        <span className="font-medium">{currency}</span>
      </button>

      {open && (
        <div className="card absolute right-0 top-full z-50 mt-2 w-56 p-3 shadow-pop">
          <div className="label mb-2">Currency</div>
          <div className="space-y-1">
            {Object.entries(CURRENCIES).map(([code, def]) => (
              <button
                key={code}
                onClick={() => {
                  setCurrency(code);
                  setOpen(false);
                  // Server components re-render with the new cookie.
                  router.refresh();
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-brand-tint ${
                  currency === code ? 'font-medium text-brand' : 'text-muted'
                }`}
              >
                <span>
                  {def.symbol} {code}
                </span>
                <span className="text-xs text-subtle">{def.label}</span>
              </button>
            ))}
          </div>

          <div className="label mb-2 mt-4">Language</div>
          <div className="rounded-lg px-3 py-2 text-sm font-medium text-brand">English</div>
          <p className="px-3 text-xs text-subtle">More languages coming.</p>
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 10h15M10 2.5c2.5 2.4 2.5 12.6 0 15M10 2.5c-2.5 2.4-2.5 12.6 0 15" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
