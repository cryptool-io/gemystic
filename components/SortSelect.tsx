'use client';

import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Mobile sort control. On a phone, four sort chips cost a full row of prime
 * screen space, a native <select> costs half a row, is familiar, and gets the
 * OS picker for free.
 */
export function SortSelect({
  current,
  options,
}: {
  current: string;
  options: readonly (readonly [string, string])[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'featured') next.delete('sort');
    else next.set('sort', value);
    const qs = next.toString();
    router.push(`/shop${qs ? `?${qs}` : ''}`);
  }

  return (
    <label className="flex min-w-0 flex-1 items-center gap-2">
      <span className="sr-only">Sort by</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="field py-2 text-sm"
        aria-label="Sort results"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
