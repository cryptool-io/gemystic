'use client';

import { useState } from 'react';

/**
 * On a phone the filter list is ~30 links tall, which pushes every product below
 * the fold — you would scroll past the whole taxonomy before seeing a gemstone.
 * So it collapses behind a toggle below `lg` and sits open as a sidebar above it.
 *
 * Children are server-rendered and passed through, so the filter links stay plain
 * `<a>` elements and keep working without JavaScript.
 */
export function FilterPanel({
  children,
  activeCount,
}: {
  children: React.ReactNode;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <aside>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="shop-filters"
        className="btn-ghost w-full justify-between lg:hidden"
      >
        <span>
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-white">
              {activeCount}
            </span>
          )}
        </span>
        <span aria-hidden="true" className={open ? 'rotate-180 transition' : 'transition'}>
          ⌄
        </span>
      </button>

      <div
        id="shop-filters"
        className={`${open ? 'mt-4 block' : 'hidden'} space-y-7 lg:mt-0 lg:block`}
      >
        {children}
      </div>
    </aside>
  );
}
