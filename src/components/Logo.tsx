/**
 * Gemystic Gems logomark.
 *
 * An emerald-cut gemstone drawn as facets: the octagonal step cut every gem
 * buyer recognises, with a table, crown facets and a highlight so it reads as a
 * cut stone rather than a generic diamond outline. Built as inline SVG (not an
 * image file) so it inherits `currentColor`, scales without blur on any display,
 * and adds no network request. Emerald cut chosen deliberately, it is the
 * signature cut of this shop's flagship Swat emeralds.
 */
export function GemMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="gem-face" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10a37f" />
          <stop offset="0.55" stopColor="#047857" />
          <stop offset="1" stopColor="#043d2f" />
        </linearGradient>
        <linearGradient id="gem-table" x1="16" y1="10" x2="32" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e6f4ef" />
          <stop offset="1" stopColor="#a7d6c5" />
        </linearGradient>
      </defs>

      {/* Emerald-cut outline: octagon with clipped corners */}
      <path
        d="M15 6 H33 L42 15 V33 L33 42 H15 L6 33 V15 Z"
        fill="url(#gem-face)"
        stroke="#043d2f"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Crown facet lines from each corner to the table */}
      <path
        d="M15 6 L18 15 M33 6 L30 15 M42 15 L33 18 M42 33 L33 30 M33 42 L30 33 M15 42 L18 33 M6 33 L15 30 M6 15 L15 18"
        stroke="#043d2f"
        strokeWidth="0.9"
        strokeOpacity="0.55"
        strokeLinecap="round"
      />

      {/* Rectangular table (top facet) */}
      <path
        d="M18 15 H30 L33 18 V30 L30 33 H18 L15 30 V18 Z"
        fill="url(#gem-table)"
        fillOpacity="0.92"
        stroke="#043d2f"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Highlight glint */}
      <path d="M20 18 L26 18 L22 24 Z" fill="#ffffff" fillOpacity="0.6" />
    </svg>
  );
}

export function Logo({
  className = '',
  markClass = 'h-7 w-7',
}: {
  className?: string;
  markClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <GemMark className={markClass} />
      <span className="font-display text-lg tracking-tight sm:text-xl">
        <span className="text-brand-deep">Gemystic</span>{' '}
        <span className="text-brand">Gems</span>
      </span>
    </span>
  );
}
