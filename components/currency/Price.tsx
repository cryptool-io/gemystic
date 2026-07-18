'use client';

import { formatMoney } from '@/lib/currency';
import { useCurrency } from './CurrencyProvider';

/**
 * The only way money is rendered on the storefront. Takes the stored USD value
 * and formats in the visitor's currency; when `original` is present (campaign
 * discount) it renders the strikethrough pair. Admin and finance screens stay
 * hard-USD on purpose, the business books in one currency.
 */
export function Price({
  usd,
  original = null,
  className = '',
  suffix,
}: {
  usd: number;
  original?: number | null;
  className?: string;
  suffix?: string;
}) {
  const { currency, currencies } = useCurrency();

  return (
    <span className={className}>
      {original !== null && original > usd && (
        <s className="mr-1.5 text-sm font-normal text-subtle">{formatMoney(original, currency, currencies)}</s>
      )}
      {formatMoney(usd, currency, currencies)}
      {suffix && <span className="ml-1 text-[11px] font-normal text-muted">{suffix}</span>}
    </span>
  );
}

/** Per-carat helper, converts the rate, not just the total, so units agree. */
export function PricePerCarat({ usd, carat }: { usd: number; carat: number }) {
  const { currency, currencies } = useCurrency();
  if (!carat) return null;
  return <span className="text-[11px] text-muted">{formatMoney(usd / carat, currency, currencies)}/ct</span>;
}
