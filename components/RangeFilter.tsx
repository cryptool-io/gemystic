'use client';

import { useState } from 'react';

/**
 * Dual-handle range slider over two overlaid native range inputs.
 *
 * Native inputs rather than a drag library: they are keyboard and screen-reader
 * accessible for free, and they submit with the surrounding GET form exactly
 * like the number inputs they replace. The handles cannot cross (each clamps
 * against the other), and the filled span between them is drawn on the track
 * underneath.
 */
export function RangeFilter({
  minName,
  maxName,
  bound,
  value,
  step = 1,
  prefix = '',
  suffix = '',
}: {
  minName: string;
  maxName: string;
  bound: { min: number; max: number };
  value: { min?: number; max?: number };
  step?: number;
  /** Strings rather than a formatter: functions cannot cross to a client component. */
  prefix?: string;
  suffix?: string;
}) {
  const [lo, setLo] = useState(value.min ?? bound.min);
  const [hi, setHi] = useState(value.max ?? bound.max);

  const span = Math.max(1, bound.max - bound.min);
  const pct = (v: number) => ((v - bound.min) / span) * 100;
  const format = (v: number) => `${prefix}${v.toLocaleString('en-US')}${suffix}`;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted tabular-nums">
        <span>{format(lo)}</span>
        <span>{format(hi)}</span>
      </div>

      <div className="relative h-6">
        {/* Track + selected span */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />

        <input
          type="range"
          name={minName}
          aria-label={`Minimum ${minName}`}
          min={bound.min}
          max={bound.max}
          step={step}
          value={lo}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi))}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          name={maxName}
          aria-label={`Maximum ${maxName}`}
          min={bound.min}
          max={bound.max}
          step={step}
          value={hi}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo))}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
        />
      </div>
    </div>
  );
}
