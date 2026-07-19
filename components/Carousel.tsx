'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Infinite carousel.
 *
 * The set is rendered three times in a row and the scroll position is kept in
 * the middle copy. When it drifts into the first or last copy, the position
 * jumps one copy back or forward: the pixels under the cursor are identical, so
 * the jump is invisible, and the strip never reaches an end in either
 * direction. That gives a genuine loop rather than a bar that stops.
 *
 * It also drifts on its own, slowly, and pauses the moment a visitor hovers,
 * focuses or touches it, so the motion never fights someone trying to read a
 * card. Everything stays inside the container: cards do not run past the edge
 * of the page, they fade out at a soft boundary instead.
 */
const CARD_STEP = 224; // one 13rem card plus its gap
const DRIFT_MS = 32; // ~30fps, enough for a smooth slow crawl
const DRIFT_PX = 0.4; // per tick, about 12px a second

export function Carousel({
  children,
  ariaLabel,
  autoplay = true,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  autoplay?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);
  // Guards the wrap so it cannot re-enter while it is repositioning.
  const wrapping = useRef(false);
  /**
   * Drift position as a float.
   *
   * scrollLeft is stored in whole pixels, so adding a sub-pixel step to it each
   * tick rounds straight back down and the strip never moves. Keeping the real
   * position here and assigning the running total means the fractional part
   * accumulates until it crosses a pixel. (This is why the bug hid in
   * development: StrictMode mounts effects twice, two intervals added their
   * steps together and cleared a pixel per tick, while production ran one.)
   */
  const driftPos = useRef<number | null>(null);

  /** One copy of the set. The track holds exactly three. */
  const bandWidth = useCallback(() => {
    const el = trackRef.current;
    return el ? el.scrollWidth / 3 : 0;
  }, []);

  /** Keeps the position inside the middle copy, invisibly. */
  const recentre = useCallback(() => {
    const el = trackRef.current;
    if (!el || wrapping.current) return;
    const band = bandWidth();
    if (band <= 0) return;

    if (el.scrollLeft < band * 0.5) {
      wrapping.current = true;
      el.scrollLeft += band;
      wrapping.current = false;
    } else if (el.scrollLeft > band * 1.5) {
      wrapping.current = true;
      el.scrollLeft -= band;
      wrapping.current = false;
    }
  }, [bandWidth]);

  /**
   * Start in the middle copy so there is material in both directions at once.
   *
   * This waits for the track to actually have width rather than assuming one
   * frame is enough: the cards are sized by images, so on a cold load the
   * first frame measures zero and a single attempt would leave the strip
   * pinned at the start with nothing to its left. A ResizeObserver positions
   * it as soon as real layout exists, and disconnects once it has.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const place = () => {
      const band = bandWidth();
      if (band <= 0 || el.clientWidth <= 0) return false;
      el.scrollLeft = band;
      return true;
    };

    if (place()) return;

    const observer = new ResizeObserver(() => {
      if (place()) observer.disconnect();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [bandWidth]);

  // Continuous drift. Pointer-driven scrolling is untouched by this: the
  // interval only nudges the position when nobody is interacting. It measures
  // every tick rather than trusting a flag, so a late-loading image or a
  // resize cannot leave the carousel stuck.
  useEffect(() => {
    if (!autoplay || paused) return;
    const el = trackRef.current;
    if (!el) return;

    const id = setInterval(() => {
      const band = bandWidth();
      if (band <= 0) return;

      // Self-heal: if the strip is sitting at an edge (a resize, or the first
      // placement having missed), bring it back into the middle copy.
      if (el.scrollLeft <= 0) el.scrollLeft = band;

      // Resync whenever something other than the drift moved the strip: a
      // swipe, an arrow, or the wrap jumping a whole copy.
      if (driftPos.current === null || Math.abs(driftPos.current - el.scrollLeft) > 2) {
        driftPos.current = el.scrollLeft;
      }

      driftPos.current += DRIFT_PX;
      el.scrollLeft = driftPos.current;
      recentre();
    }, DRIFT_MS);

    return () => {
      clearInterval(id);
      driftPos.current = null;
    };
  }, [autoplay, paused, bandWidth, recentre]);

  function page(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    // Move by whole cards, roughly a viewport at a time on a wide screen.
    const step = Math.max(CARD_STEP, Math.floor(el.clientWidth / CARD_STEP) * CARD_STEP);
    el.scrollBy({ left: step * direction, behavior: 'smooth' });
  }

  return (
    <div
      className="carousel relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={recentre}
        className="carousel-track flex overflow-x-auto overflow-y-hidden"
      >
        {/* Three copies: the middle one is the real list, the outer two exist
            only so there is always more strip on either side to scroll into. */}
        <ul className="flex shrink-0 gap-4 pr-4" aria-hidden="true">
          {children}
        </ul>
        <ul className="flex shrink-0 gap-4 pr-4" aria-label={ariaLabel}>
          {children}
        </ul>
        <ul className="flex shrink-0 gap-4 pr-4" aria-hidden="true">
          {children}
        </ul>
      </div>

      {/* Both arrows are always available: there is no end to reach. */}
      <Arrow direction="left" onClick={() => page(-1)} />
      <Arrow direction="right" onClick={() => page(1)} />
    </div>
  );
}

function Arrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  const isLeft = direction === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? 'Scroll back' : 'Scroll forward'}
      className={`absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-fg shadow-card backdrop-blur-sm transition hover:border-brand-ring hover:text-brand sm:flex ${
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
