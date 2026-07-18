'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

type NavItem =
  | { kind: 'category'; category: CategoryNode }
  | { kind: 'flat'; label: string; href: string };

// Reserved open-state key for the overflow dropdown; category slugs never start with '__'.
const MORE = '__more';

export function MainNav({ categories }: { categories: CategoryNode[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  // Portals need document, which only exists after mount.
  const [mounted, setMounted] = useState(false);
  // null = not yet measured (SSR and first paint): render every item, no More menu.
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

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

  const items: NavItem[] = [
    ...stocked.map((category) => ({ kind: 'category' as const, category })),
    ...FLAT.map(([label, href]) => ({ kind: 'flat' as const, label, href })),
  ];
  const itemsKey = items
    .map((item) => (item.kind === 'category' ? item.category.name : item.label))
    .join('|');

  // Priority+ collapse: the nav is the flexible element in the header row, so its
  // width is the space the row can spare. Trailing items that do not fit move into
  // a More dropdown. Widths come from an invisible measurement copy because the
  // real items unmount when collapsed.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const row = measureRef.current;
    if (!nav || !row) return;

    const recompute = () => {
      const els = Array.from(row.children) as HTMLElement[];
      if (els.length < 2) return;
      const moreWidth = els[els.length - 1].getBoundingClientRect().width;
      const widths = els.slice(0, -1).map((el) => el.getBoundingClientRect().width);
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      // 1px of slack absorbs subpixel rounding at fractional zoom levels.
      const available = nav.clientWidth - 1;

      const full = widths.reduce((a, w) => a + w, 0) + gap * (widths.length - 1);
      if (full <= available) {
        setVisibleCount(widths.length);
        return;
      }
      let used = moreWidth;
      let count = 0;
      for (const w of widths) {
        if (used + gap + w > available) break;
        used += gap + w;
        count += 1;
      }
      setVisibleCount(count);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(nav);
    // The measurement row resizes when the web fonts finish loading.
    ro.observe(row);
    return () => ro.disconnect();
  }, [itemsKey]);

  const shown = visibleCount === null ? items : items.slice(0, visibleCount);
  const overflow = visibleCount === null ? [] : items.slice(visibleCount);

  const itemButtonClass =
    'whitespace-nowrap rounded-lg px-2.5 py-2 transition hover:bg-brand-tint hover:text-brand-dark xl:px-3';

  return (
    <>
      {/* Desktop */}
      <nav
        ref={navRef}
        className="relative hidden min-w-0 flex-1 items-center justify-end gap-0.5 text-sm text-muted lg:flex"
        aria-label="Main"
      >
        {/* Zero-size clip so the measurement row can never widen the page. */}
        <div aria-hidden="true" className="absolute left-0 top-0 h-0 w-0 overflow-hidden">
          <div ref={measureRef} className="flex w-max items-center gap-0.5">
            {items.map((item) => (
              <span
                key={item.kind === 'category' ? item.category.slug : item.href}
                className="whitespace-nowrap px-2.5 py-2 xl:px-3"
              >
                {item.kind === 'category' ? item.category.name : item.label}
              </span>
            ))}
            <span className="flex items-center gap-1 whitespace-nowrap px-2.5 py-2 xl:px-3">
              More
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </div>
        </div>

        {shown.map((item) =>
          item.kind === 'category' ? (
            <div
              key={item.category.slug}
              className="relative"
              onMouseEnter={() => setOpen(item.category.slug)}
              onMouseLeave={() => setOpen(null)}
            >
              <button
                onClick={() => setOpen(open === item.category.slug ? null : item.category.slug)}
                aria-expanded={open === item.category.slug}
                className={itemButtonClass}
              >
                {item.category.name}
              </button>

              {open === item.category.slug && (
                <div className="card absolute left-0 top-full z-50 max-h-[70vh] w-72 overflow-y-auto p-2 shadow-pop">
                  <Link
                    href={`/shop?category=${item.category.slug}`}
                    onClick={() => setOpen(null)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-fg transition hover:bg-brand-tint hover:text-brand-dark"
                  >
                    All {item.category.name.toLowerCase()}
                    <span className="ml-1 text-muted">({item.category.count})</span>
                  </Link>

                  {item.category.species.length > 0 && (
                    <div className="mt-1 border-t border-line pt-1">
                      {item.category.species.map((s) => (
                        <Link
                          key={s.key}
                          href={`/shop?category=${item.category.slug}&species=${s.key}`}
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
          ) : (
            <Link key={item.href} href={item.href} className={itemButtonClass}>
              {item.label}
            </Link>
          ),
        )}

        {overflow.length > 0 && (
          <div
            className="relative"
            onMouseEnter={() => setOpen(MORE)}
            onMouseLeave={() => setOpen(null)}
          >
            <button
              onClick={() => setOpen(open === MORE ? null : MORE)}
              aria-expanded={open === MORE}
              className={`${itemButtonClass} flex items-center gap-1`}
            >
              More
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {open === MORE && (
              <div className="card absolute right-0 top-full z-50 max-h-[70vh] w-64 overflow-y-auto p-2 shadow-pop">
                {overflow.map((item) =>
                  item.kind === 'category' ? (
                    <Link
                      key={item.category.slug}
                      href={`/shop?category=${item.category.slug}`}
                      onClick={() => setOpen(null)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                    >
                      <span>{item.category.name}</span>
                      <span className="text-xs text-subtle">{item.category.count}</span>
                    </Link>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(null)}
                      className="block rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>
        )}
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
            className="absolute inset-0 bg-fg/40 backdrop-blur-xs"
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
