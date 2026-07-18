'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchBox } from './SearchBox';
import type { CategoryNode } from '@/lib/taxonomy';

/**
 * Navigation is generated from the taxonomy, not hardcoded. Adding a category in
 * data/taxonomy.json (later, the admin portal) puts it in the menu with its live
 * stock count, no code change, and no link to a shelf that has nothing on it.
 *
 * Hover dropdowns above `md`; the same tree collapses into a drawer below, because
 * a hover menu is unusable on a touch device.
 */
const FLAT: [string, string][] = [
  ['Learn', '/learn'],
  ['Contact', '/contact'],
  ['Studio', '/studio'],
];

export function MainNav({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  // Portals need document, which only exists after mount.
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false);
        setOpen(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Empty categories are hidden rather than shown as dead ends.
  const stocked = categories.filter((c) => c.count > 0);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-0.5 text-sm text-muted lg:flex" aria-label="Main">
        {stocked.map((category) => (
          <div
            key={category.slug}
            className="relative"
            onMouseEnter={() => setOpen(category.slug)}
            onMouseLeave={() => setOpen(null)}
          >
            <button
              onClick={() => setOpen(open === category.slug ? null : category.slug)}
              aria-expanded={open === category.slug}
              className="whitespace-nowrap rounded-lg px-2.5 py-2 transition hover:bg-brand-tint hover:text-brand-dark xl:px-3"
            >
              {category.name}
            </button>

            {open === category.slug && (
              <div className="card absolute left-0 top-full z-50 max-h-[70vh] w-72 overflow-y-auto p-2 shadow-pop">
                <Link
                  href={`/shop?category=${category.slug}`}
                  onClick={() => setOpen(null)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-fg transition hover:bg-brand-tint hover:text-brand-dark"
                >
                  All {category.name.toLowerCase()}
                  <span className="ml-1 text-muted">({category.count})</span>
                </Link>

                {category.species.length > 0 && (
                  <div className="mt-1 border-t border-line pt-1">
                    {category.species.map((s) => (
                      <Link
                        key={s.key}
                        href={`/shop?category=${category.slug}&species=${s.key}`}
                        onClick={() => setOpen(null)}
                        className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-subtle">{s.count}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {FLAT.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-2.5 py-2 transition hover:bg-brand-tint hover:text-brand-dark xl:px-3"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile trigger */}
      <button
        onClick={() => setDrawer(true)}
        aria-label="Open menu"
        aria-expanded={drawer}
        className="btn-ghost px-3 lg:hidden"
      >
        <span className="sr-only">Menu</span>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile drawer, portalled to <body> so it escapes the header's
          backdrop-filter, which otherwise becomes the containing block for
          position:fixed and traps the drawer inside the 64px header. */}
      {mounted &&
        drawer &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-fg/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,90vw)] flex-col bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-display text-lg">Menu</span>
              <button onClick={() => setDrawer(false)} aria-label="Close menu" className="btn-ghost px-3">
                ✕
              </button>
            </div>

            <div className="border-b border-line p-4">
              <SearchBox compact onNavigate={() => setDrawer(false)} />
            </div>

            <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile">
              {stocked.map((category) => (
                <details key={category.slug} className="border-b border-line py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-2.5 font-medium text-fg marker:content-['']">
                    <span>{category.name}</span>
                    <span className="text-xs text-subtle">{category.count}</span>
                  </summary>
                  <div className="pb-2">
                    <Link
                      href={`/shop?category=${category.slug}`}
                      onClick={() => setDrawer(false)}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-brand"
                    >
                      All {category.name.toLowerCase()}
                    </Link>
                    {category.species.map((s) => (
                      <Link
                        key={s.key}
                        href={`/shop?category=${category.slug}&species=${s.key}`}
                        onClick={() => setDrawer(false)}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-subtle">{s.count}</span>
                      </Link>
                    ))}
                  </div>
                </details>
              ))}

              {FLAT.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawer(false)}
                  className="block border-b border-line py-3 font-medium text-fg"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
