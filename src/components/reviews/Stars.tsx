/**
 * Star rating display. `sr-only` text carries the actual value so screen readers
 * and print don't depend on the visual stars.
 */
export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 20 : size === 'md' ? 16 : 13;
  const rounded = Math.round(value * 2) / 2;

  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rounded >= i ? 'full' : rounded >= i - 0.5 ? 'half' : 'empty';
        return <Star key={i} size={dim} fill={fill} />;
      })}
    </span>
  );
}

function Star({ size, fill }: { size: number; fill: 'full' | 'half' | 'empty' }) {
  const id = `half-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <defs>
        <linearGradient id={id}>
          <stop offset="50%" stopColor="#047857" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z"
        fill={fill === 'full' ? '#047857' : fill === 'half' ? `url(#${id})` : 'none'}
        stroke="#047857"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
