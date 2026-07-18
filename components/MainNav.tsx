'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SearchBox } from './SearchBox';
import type { CategoryNode } from '@/lib/taxonomy';

/**
 * Header navigation.
 *
 * Six category tabs of equal weight misdescribed the catalogue: one category
 * holds two thirds of the stock and two hold a handful. They now live inside a
 * single Shop panel where they can be weighted honestly, alongside the entry
 * point customers actually want, which is the stone itself ("emerald"), not its
 * cut form. That leaves four top-level items, which fit at every width, so the
 * old measure-and-overflow "More" menu is gone rather than patched.
 *
 * Hover panel above lg; the same content collapses into a drawer below, because
 * a hover menu is unusable on a touch device.
 */
const FLAT: [string, string][] = [
  ['Jewellery', '/shop?category=jewellery'],
  ['Wholesale', '/shop?category=parcels'],
  ['Learn', '/learn'],
];

export interface SpeciesLink {
  key: string;
  name: string;
  count: number;
}

export function MainNav({
  categories,
  species,
  total,
}: {
  categories: CategoryNode[];
  species: SpeciesLink[];
  total: number;
}) {
  const [shopOpen, setShopOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Hover intent: without a small delay the panel flickers as the cursor
  // crosses the gap between the trigger and the panel itself.
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setShopOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(
    () => () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );

  function openSoon() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => setShopOpen(true), 120);
  }

  function closeSoon() {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => setShopOpen(false), 200);
  }

  // Empty categories are hidden rather than shown as dead ends.
  const stocked = categories.filter((c) => c.count > 0);
  const topSpecies = [...species].sort((a, b) => b.count - a.count).slice(0, 8);

  const itemClass =
    'whitespace-nowrap rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark';

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
        <div onMouseEnter={openSoon} onMouseLeave={closeSoon}>
          {/* A real link, not a dead trigger: clicking Shop goes to the shop. */}
          <Link
            href="/shop"
            aria-expanded={shopOpen}
            aria-haspopup="true"
            onFocus={() => setShopOpen(true)}
            onClick={() => setShopOpen(false)}
            className={`${itemClass} ${shopOpen ? 'bg-brand-tint text-brand-dark' : ''}`}
          >
            Shop
          </Link>
        </div>

        {FLAT.map(([label, href]) => (
          <Link key={href} href={href} className={itemClass}>
            {label}
          </Link>
        ))}
      </nav>

      {/* Mega panel, full width under the header */}
      {shopOpen && (
        <div
          onMouseEnter={openSoon}
          onMouseLeave={closeSoon}
          className="absolute inset-x-0 top-full z-50 hidden border-b border-line bg-surface shadow-lift lg:block"
        >
          <div className="wrap grid grid-cols-3 gap-10 py-8">
            <section aria-label="Shop by form">
              <div className="label mb-3">By form</div>
              <ul className="space-y-1.5">
                {stocked.map((c, i) => (
                  <li key={c.slug}>
                    <Link
                      href={`/shop?category=${c.slug}`}
                      onClick={() => setShopOpen(false)}
                      className={`flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm transition hover:bg-brand-tint hover:text-brand-dark ${
                        i === 0 ? 'font-medium text-fg' : 'text-muted'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-subtle tabular-nums">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/shop"
                onClick={() => setShopOpen(false)}
                className="mt-3 inline-block px-2 text-sm text-brand hover:text-brand-dark"
              >
                View all {total} stones →
              </Link>
            </section>

            <section aria-label="Shop by stone">
              <div className="label mb-3">Popular stones</div>
              <ul className="space-y-1.5">
                {topSpecies.map((s) => (
                  <li key={s.key}>
                    <Link
                      href={`/shop?species=${s.key}`}
                      onClick={() => setShopOpen(false)}
                      className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-subtle tabular-nums">{s.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Browse by">
              <div className="label mb-3">Browse by</div>
              <ul className="space-y-1.5">
                {[
                  ['Birthstones', '/collections/birthstones'],
                  ['New arrivals', '/shop?sort=newest'],
                  ['Under $200', '/shop?max=200'],
                  ['Certified stones', '/shop?sort=price-desc'],
                ].map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setShopOpen(false)}
                      className="block rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-4 px-2 text-xs leading-relaxed text-subtle">
                Every stone is one of a kind. The photograph is the stone that ships, and when it
                sells it is gone for good.
              </p>
            </section>
          </div>
        </div>
      )}

      {/* Mobile trigger */}
      <button
        onClick={() => setDrawer(true)}
        className="btn-ghost h-10 px-3 lg:hidden"
        aria-label="Open menu"
        aria-expanded={drawer}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile drawer, portalled so no ancestor transform can trap it */}
      {mounted &&
        drawer &&
        createPortal(
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div
              className="absolute inset-0 bg-fg/40 backdrop-blur-xs"
              onClick={() => setDrawer(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-surface shadow-pop">
              <div className="flex items-center justify-between border-b border-line p-4">
                <span className="font-display text-lg">Menu</span>
                <button onClick={() => setDrawer(false)} className="btn-ghost px-3" aria-label="Close menu">
                  ✕
                </button>
              </div>

              <div className="border-b border-line p-4">
                <SearchBox onNavigate={() => setDrawer(false)} />
              </div>

              <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile">
                <div className="label mb-2">Shop</div>
                <ul className="space-y-0.5">
                  {stocked.map((c) => (
                    <li key={c.slug}>
                      {/* A row is a link, not an accordion: tapping a category
                          should open the category, not expand a sub-list. */}
                      <Link
                        href={`/shop?category=${c.slug}`}
                        onClick={() => setDrawer(false)}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm text-fg transition hover:bg-brand-tint"
                      >
                        <span>{c.name}</span>
                        <span className="text-xs text-subtle tabular-nums">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/shop"
                      onClick={() => setDrawer(false)}
                      className="block rounded-lg px-2 py-2.5 text-sm text-brand transition hover:bg-brand-tint"
                    >
                      View all {total} stones →
                    </Link>
                  </li>
                </ul>

                <div className="label mb-2 mt-5">Popular stones</div>
                <div className="flex flex-wrap gap-1.5">
                  {topSpecies.slice(0, 6).map((s) => (
                    <Link
                      key={s.key}
                      href={`/shop?species=${s.key}`}
                      onClick={() => setDrawer(false)}
                      className="chip hover:border-brand-ring"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>

                <ul className="mt-5 space-y-0.5 border-t border-line pt-4">
                  {[
                    ['Birthstones', '/collections/birthstones'],
                    ['Learn and buying guides', '/learn'],
                    ['Contact us', '/contact'],
                  ].map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setDrawer(false)}
                        className="block rounded-lg px-2 py-2.5 text-sm text-muted transition hover:bg-brand-tint hover:text-brand-dark"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
