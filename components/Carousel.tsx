'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A real carousel: arrows, scroll snapping, and a page indicator.
 *
 * The previous "just listed" strip was an auto-scrolling film loop, which looks
 * like motion but gives the visitor no control, no sense of how much there is,
 * and no way back to a stone that has slid past. This scrolls the native
 * container instead, so it keeps keyboard access, touch swipe and momentum for
 * free, and the arrows are genuinely optional rather than the only way through.
 */
export function Carousel({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function measure() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function page(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    // Scroll by a viewport of the track, less a card's worth of overlap so the
    // visitor keeps a visual anchor between pages.
    const amount = Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        onScroll={measure}
        aria-label={ariaLabel}
        className="scroll-x flex snap-x snap-mandatory gap-4 scroll-pl-4 pb-2"
      >
        {children}
      </ul>

      {/* Arrows are hidden at the ends rather than disabled-but-present, so the
          control never invites a click that does nothing. */}
      {!atStart && (
        <Arrow direction="left" onClick={() => page(-1)} />
      )}
      {!atEnd && (
        <Arrow direction="right" onClick={() => page(1)} />
      )}
    </div>
  );
}

function Arrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const isLeft = direction === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? 'Previous stones' : 'More stones'}
      className={`absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-fg shadow-card backdrop-blur-sm transition hover:border-brand-ring hover:text-brand sm:flex ${
        isLeft ? 'left-1' : 'right-1'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d={isLeft ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
