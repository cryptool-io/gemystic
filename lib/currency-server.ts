import 'server-only';
import { cache } from 'react';
import { prisma, hasDatabase } from './prisma';
import { CURRENCIES, type CurrencyMap } from './currency';

/**
 * The currency table the storefront actually uses: data/currencies.json as
 * shipped, with the owner's edits and additions from the database layered on.
 * Read once per request and handed to CurrencyProvider, so every price on the
 * page formats from the same set.
 */
export const activeCurrencies = cache(async (): Promise<CurrencyMap> => {
  if (!hasDatabase()) return CURRENCIES;

  try {
    const rows = await prisma.currencyRate.findMany({ where: { isActive: true } });
    if (rows.length === 0) return CURRENCIES;

    const merged: CurrencyMap = { ...CURRENCIES };
    for (const r of rows) {
      merged[r.code] = {
        label: r.label,
        symbol: r.symbol,
        rate: Number(r.rate),
        locale: r.locale,
      };
    }
    // USD is the base by definition; a stored rate for it would be a bug.
    merged.USD = CURRENCIES.USD;
    return merged;
  } catch {
    return CURRENCIES;
  }
});
