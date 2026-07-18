'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Filter shell for the shop.
 *
 * Below `lg`, filters open as a slide-over popup OVER the results (portalled to
 * <body>, backdrop behind) rather than expanding inline, the product grid
 * never gets pushed off screen, and closing returns you to exactly where you
 * were. Above `lg` the same children render as a plain sidebar.
 *
 * Children are server-rendered links passed straight through, so every filter
 * still works before hydration; clicking one navigates, which also closes the
 * popup by virtue of the new page render.
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <aside>
      {/* Mobile control row: Filters trigger + sort, one compact line */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-haspopup="dialog"
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
          <span aria-hidden="true">⚙</span>
        </button>

        {sortSlot && <Suspense fallback={null}>{sortSlot}</Suspense>}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">{children}</div>

      {/* Mobile slide-over popup */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
            <div
              className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(21rem,88vw)] flex-col bg-surface shadow-pop">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <span className="font-display text-lg">
                  Filters
                  {activeCount > 0 && (
                    <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-white">
                      {activeCount}
                    </span>
                  )}
                </span>
                <button onClick={() => setOpen(false)} aria-label="Close filters" className="btn-ghost px-3">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">{children}</div>

              <div className="border-t border-line p-4">
                <button onClick={() => setOpen(false)} className="btn-primary w-full">
                  Show results
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
}
