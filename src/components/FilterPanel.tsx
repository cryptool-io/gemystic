'use client';

import { Suspense, useState } from 'react';

/**
 * Filter shell for the shop.
 *
 * Below `lg` the filter tree collapses behind a toggle that shares one compact
 * row with the sort control — on a 375px phone the pre-products chrome is now
 * ~3 short rows (title, chips-if-any, this row) instead of half the viewport.
 * Above `lg` it renders as an always-open sidebar and the sort slot hides
 * (desktop shows sort chips beside the grid instead).
 *
 * Children are server-rendered links passed straight through, so filtering
 * still works before hydration.
 */
export function FilterPanel({
  children,
  activeCount,
  sortSlot,
}: {
  children: React.ReactNode;
  activeCount: number;
  sortSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside>
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="shop-filters"
          className="btn-ghost flex-1 justify-between py-2"
        >
          <span>
            Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-white">
                {activeCount}
              </span>
            )}
          </span>
          <span aria-hidden="true" className={`transition ${open ? 'rotate-180' : ''}`}>
            ⌄
          </span>
        </button>

        {/* useSearchParams inside SortSelect needs a Suspense boundary. */}
        {sortSlot && <Suspense fallback={null}>{sortSlot}</Suspense>}
      </div>

      <div
        id="shop-filters"
        className={`${open ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}
      >
        {children}
      </div>
    </aside>
  );
}
